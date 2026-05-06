import { Injectable, Logger } from '@nestjs/common';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';

import { EventEnvelope } from '../events/event-envelope.interface';
import { DEFAULT_CONSUMER_MAX_RETRIES } from './rabbitmq.constants';
import { RabbitMQConnection } from './rabbitmq.connection';

export type EventHandler<TPayload = unknown> = (
  envelope: EventEnvelope<TPayload>,
  raw: ConsumeMessage,
) => Promise<void> | void;

@Injectable()
export class RabbitMQConsumerService {
  private readonly logger = new Logger(RabbitMQConsumerService.name);

  constructor(private readonly connection: RabbitMQConnection) {}

  async subscribe<TPayload = unknown>(
    handler: EventHandler<TPayload>,
  ): Promise<void> {
    const opts = this.connection.getOptions();
    if (!opts.queue) {
      throw new Error('Cannot subscribe: queue is not configured');
    }
    const maxRetries = opts.consumerMaxRetries ?? DEFAULT_CONSUMER_MAX_RETRIES;
    const channel = this.connection.getChannel();

    await channel.addSetup(async (ch: ConfirmChannel) => {
      await ch.consume(opts.queue!, async (msg) => {
        if (!msg) {
          return;
        }
        await this.handleMessage(ch, msg, handler, maxRetries);
      });
      this.logger.log(`Subscribed to queue ${opts.queue}`);
    });
  }

  private async handleMessage<TPayload>(
    channel: ConfirmChannel,
    msg: ConsumeMessage,
    handler: EventHandler<TPayload>,
    maxRetries: number,
  ): Promise<void> {
    let envelope: EventEnvelope<TPayload>;
    try {
      envelope = JSON.parse(
        msg.content.toString('utf-8'),
      ) as EventEnvelope<TPayload>;
    } catch (error) {
      this.logger.error(
        `Rejecting non-JSON message: ${(error as Error).message}`,
      );
      channel.nack(msg, false, false);
      return;
    }

    const attempts = this.getAttempts(msg);
    try {
      await handler(envelope, msg);
      channel.ack(msg);
      this.logger.log(
        `Processed event ${envelope.id} type=${envelope.type} attempts=${attempts + 1}`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Processing failed for ${envelope.id} attempts=${attempts + 1}: ${err.message}`,
      );

      if (attempts + 1 >= maxRetries) {
        this.logger.warn(
          `Sending event ${envelope.id} to DLQ after ${attempts + 1} attempts`,
        );
        channel.nack(msg, false, false);
      } else {
        channel.nack(msg, false, true);
      }
    }
  }

  private getAttempts(msg: ConsumeMessage): number {
    const death = (msg.properties.headers?.['x-death'] as
      | Array<{ count: number }>
      | undefined) ?? [];
    return death.reduce((total, entry) => total + (entry.count ?? 0), 0);
  }
}

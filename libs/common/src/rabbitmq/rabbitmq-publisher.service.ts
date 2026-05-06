import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { EventEnvelope } from '../events/event-envelope.interface';
import {
  DEFAULT_PUBLISH_RETRIES,
  DEFAULT_PUBLISH_RETRY_DELAY_MS,
} from './rabbitmq.constants';
import { RabbitMQConnection } from './rabbitmq.connection';

export interface PublishOptions {
  routingKey?: string;
  retries?: number;
  retryDelayMs?: number;
}

@Injectable()
export class RabbitMQPublisherService {
  private readonly logger = new Logger(RabbitMQPublisherService.name);

  constructor(private readonly connection: RabbitMQConnection) {}

  async publish<TPayload>(
    type: string,
    payload: TPayload,
    options: PublishOptions = {},
  ): Promise<EventEnvelope<TPayload>> {
    const opts = this.connection.getOptions();
    const channel = this.connection.getChannel();
    const envelope: EventEnvelope<TPayload> = {
      id: uuidv4(),
      type,
      occurredAt: new Date().toISOString(),
      payload,
    };

    const routingKey = options.routingKey ?? opts.routingKey ?? type;
    const retries =
      options.retries ?? opts.publishRetries ?? DEFAULT_PUBLISH_RETRIES;
    const delayMs =
      options.retryDelayMs ??
      opts.publishRetryDelayMs ??
      DEFAULT_PUBLISH_RETRY_DELAY_MS;

    let attempt = 0;
    let lastError: unknown;
    while (attempt <= retries) {
      try {
        await channel.publish(opts.exchange, routingKey, envelope, {
          persistent: true,
          contentType: 'application/json',
          messageId: envelope.id,
          type,
          timestamp: Date.now(),
        });
        this.logger.log(
          `Published event ${envelope.id} type=${type} routingKey=${routingKey} attempt=${attempt + 1}`,
        );
        return envelope;
      } catch (error) {
        lastError = error;
        attempt += 1;
        this.logger.warn(
          `Publish failed (attempt ${attempt}/${retries + 1}) for ${envelope.id}: ${(error as Error).message}`,
        );
        if (attempt > retries) {
          break;
        }
        await this.delay(delayMs * attempt);
      }
    }

    this.logger.error(
      `Failed to publish event ${envelope.id} after ${retries + 1} attempts`,
    );
    throw lastError instanceof Error
      ? lastError
      : new Error('Unknown publish error');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

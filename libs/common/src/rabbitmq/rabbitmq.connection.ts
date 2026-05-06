import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  AmqpConnectionManager,
  ChannelWrapper,
  connect,
} from 'amqp-connection-manager';
import type { ConfirmChannel } from 'amqplib';

import {
  NOTIFICATION_DLQ,
  NOTIFICATION_DLQ_ROUTING_KEY,
  NOTIFICATION_DLX,
  RABBITMQ_OPTIONS,
} from './rabbitmq.constants';
import { RabbitMQModuleOptions } from './rabbitmq.types';

@Injectable()
export class RabbitMQConnection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQConnection.name);
  private connection: AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;

  constructor(
    @Inject(RABBITMQ_OPTIONS)
    private readonly options: RabbitMQModuleOptions,
  ) {}

  async onModuleInit(): Promise<void> {
    this.connection = connect([this.options.uri], {
      heartbeatIntervalInSeconds: 15,
      reconnectTimeInSeconds: 5,
    });

    this.connection.on('connect', () =>
      this.logger.log(`Connected to RabbitMQ at ${this.options.uri}`),
    );
    this.connection.on('disconnect', ({ err }) =>
      this.logger.warn(`Disconnected from RabbitMQ: ${err?.message}`),
    );

    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: (channel: ConfirmChannel) => this.assertTopology(channel),
    });

    await this.channelWrapper.waitForConnect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.channelWrapper) {
      await this.channelWrapper.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }

  getChannel(): ChannelWrapper {
    return this.channelWrapper;
  }

  getOptions(): RabbitMQModuleOptions {
    return this.options;
  }

  private async assertTopology(channel: ConfirmChannel): Promise<void> {
    const {
      exchange,
      queue,
      routingKey,
      deadLetterExchange = NOTIFICATION_DLX,
      deadLetterQueue = NOTIFICATION_DLQ,
      deadLetterRoutingKey = NOTIFICATION_DLQ_ROUTING_KEY,
      prefetch = 10,
    } = this.options;

    await channel.assertExchange(exchange, 'topic', { durable: true });
    await channel.assertExchange(deadLetterExchange, 'topic', {
      durable: true,
    });
    await channel.assertQueue(deadLetterQueue, { durable: true });
    await channel.bindQueue(
      deadLetterQueue,
      deadLetterExchange,
      deadLetterRoutingKey,
    );

    if (queue) {
      await channel.assertQueue(queue, {
        durable: true,
        deadLetterExchange,
        deadLetterRoutingKey,
      });
      if (routingKey) {
        await channel.bindQueue(queue, exchange, routingKey);
      }
      await channel.prefetch(prefetch);
    }
  }
}

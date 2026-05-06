import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import {
  NOTIFICATION_EXCHANGE,
  NOTIFICATION_ROUTING_KEY,
  RabbitMQModule,
} from '@app/common';

import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('RABBITMQ_URI', 'amqp://guest:guest@localhost:5672'),
        exchange: config.get<string>('NOTIFICATION_EXCHANGE', NOTIFICATION_EXCHANGE),
        routingKey: config.get<string>(
          'NOTIFICATION_ROUTING_KEY',
          NOTIFICATION_ROUTING_KEY,
        ),
        publishRetries: Number(config.get<number>('PUBLISH_RETRIES', 5)),
        publishRetryDelayMs: Number(
          config.get<number>('PUBLISH_RETRY_DELAY_MS', 500),
        ),
      }),
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class ProducerModule {}

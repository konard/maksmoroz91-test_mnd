import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import {
  NOTIFICATION_EXCHANGE,
  NOTIFICATION_ROUTING_KEY,
  RabbitMQModule,
} from '@app/common';

import { TelegramClient } from './telegram/telegram.client';
import { TelegramNotifierService } from './telegram/telegram-notifier.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('RABBITMQ_URI', 'amqp://guest:guest@localhost:5672'),
        exchange: config.get<string>('NOTIFICATION_EXCHANGE', NOTIFICATION_EXCHANGE),
        queue: config.get<string>(
          'TELEGRAM_QUEUE',
          'notifications.telegram.queue',
        ),
        routingKey: config.get<string>(
          'NOTIFICATION_ROUTING_KEY',
          NOTIFICATION_ROUTING_KEY,
        ),
        prefetch: Number(config.get<number>('TELEGRAM_PREFETCH', 5)),
        consumerMaxRetries: Number(
          config.get<number>('TELEGRAM_MAX_RETRIES', 3),
        ),
      }),
    }),
  ],
  providers: [TelegramClient, TelegramNotifierService],
})
export class TelegramNotifierModule {}

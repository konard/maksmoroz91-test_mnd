import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import {
  NOTIFICATION_EXCHANGE,
  NOTIFICATION_QUEUE,
  NOTIFICATION_ROUTING_KEY,
  RabbitMQModule,
} from '@app/common';

import { NotificationProcessorService } from './notification-processor.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('RABBITMQ_URI', 'amqp://guest:guest@localhost:5672'),
        exchange: config.get<string>('NOTIFICATION_EXCHANGE', NOTIFICATION_EXCHANGE),
        queue: config.get<string>('CONSUMER_QUEUE', NOTIFICATION_QUEUE),
        routingKey: config.get<string>(
          'NOTIFICATION_ROUTING_KEY',
          NOTIFICATION_ROUTING_KEY,
        ),
        prefetch: Number(config.get<number>('CONSUMER_PREFETCH', 10)),
        consumerMaxRetries: Number(
          config.get<number>('CONSUMER_MAX_RETRIES', 3),
        ),
      }),
    }),
  ],
  providers: [NotificationProcessorService],
})
export class ConsumerModule {}

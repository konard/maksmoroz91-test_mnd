import { DynamicModule, Module, Provider } from '@nestjs/common';

import { RABBITMQ_OPTIONS } from './rabbitmq.constants';
import { RabbitMQConsumerService } from './rabbitmq-consumer.service';
import { RabbitMQConnection } from './rabbitmq.connection';
import { RabbitMQPublisherService } from './rabbitmq-publisher.service';
import { RabbitMQModuleOptions } from './rabbitmq.types';

export interface RabbitMQAsyncOptions {
  imports?: any[];
  inject?: any[];
  useFactory: (
    ...args: any[]
  ) => Promise<RabbitMQModuleOptions> | RabbitMQModuleOptions;
}

@Module({})
export class RabbitMQModule {
  static forRootAsync(options: RabbitMQAsyncOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: RABBITMQ_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };

    return {
      module: RabbitMQModule,
      imports: options.imports ?? [],
      providers: [
        optionsProvider,
        RabbitMQConnection,
        RabbitMQPublisherService,
        RabbitMQConsumerService,
      ],
      exports: [
        RabbitMQConnection,
        RabbitMQPublisherService,
        RabbitMQConsumerService,
        RABBITMQ_OPTIONS,
      ],
      global: true,
    };
  }
}

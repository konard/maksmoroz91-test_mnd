import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import {
  EventEnvelope,
  NotificationEventDto,
  RabbitMQConsumerService,
} from '@app/common';

@Injectable()
export class NotificationProcessorService implements OnModuleInit {
  private readonly logger = new Logger(NotificationProcessorService.name);

  constructor(private readonly consumer: RabbitMQConsumerService) {}

  async onModuleInit(): Promise<void> {
    await this.consumer.subscribe<NotificationEventDto>(
      async (envelope) => this.handle(envelope),
    );
  }

  private async handle(
    envelope: EventEnvelope<NotificationEventDto>,
  ): Promise<void> {
    this.logger.log(
      `Received event ${envelope.id} type=${envelope.type} chatId=${envelope.payload?.chatId}`,
    );
    if (!envelope.payload?.chatId || !envelope.payload?.message) {
      throw new Error(
        `Invalid notification payload for event ${envelope.id}`,
      );
    }
    this.logger.log(
      `Processed notification ${envelope.id} for chat ${envelope.payload.chatId}`,
    );
  }
}

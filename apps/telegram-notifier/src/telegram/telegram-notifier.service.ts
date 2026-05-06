import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import {
  EventEnvelope,
  NotificationEventDto,
  RabbitMQConsumerService,
} from '@app/common';

import { TelegramClient } from './telegram.client';

@Injectable()
export class TelegramNotifierService implements OnModuleInit {
  private readonly logger = new Logger(TelegramNotifierService.name);

  constructor(
    private readonly consumer: RabbitMQConsumerService,
    private readonly telegram: TelegramClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.consumer.subscribe<NotificationEventDto>(
      async (envelope) => this.handle(envelope),
    );
  }

  async handle(
    envelope: EventEnvelope<NotificationEventDto>,
  ): Promise<void> {
    const { chatId, message } = envelope.payload ?? ({} as NotificationEventDto);
    if (!chatId || !message) {
      throw new Error(
        `Invalid Telegram payload for event ${envelope.id}: chatId/message missing`,
      );
    }
    const text = this.formatMessage(envelope);
    await this.telegram.sendMessage({ chatId, text });
    this.logger.log(
      `Telegram notification delivered: event=${envelope.id} chat=${chatId}`,
    );
  }

  private formatMessage(envelope: EventEnvelope<NotificationEventDto>): string {
    const { type, occurredAt, payload } = envelope;
    const header = type ? `[${type}]` : '[notification]';
    return `${header} ${payload.message}\n— sent at ${occurredAt}`;
  }
}

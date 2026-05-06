import { Injectable } from '@nestjs/common';

import {
  EventEnvelope,
  NotificationEventDto,
  RabbitMQPublisherService,
} from '@app/common';

@Injectable()
export class NotificationsService {
  constructor(private readonly publisher: RabbitMQPublisherService) {}

  async publish(
    dto: NotificationEventDto,
  ): Promise<EventEnvelope<NotificationEventDto>> {
    const type = dto.type ?? 'notification.send';
    return this.publisher.publish(type, dto);
  }
}

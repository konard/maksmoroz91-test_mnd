import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { EventEnvelope, NotificationEventDto } from '@app/common';

import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Publish a notification event to RabbitMQ',
    description:
      'Generates a UUID for the event, serialises it as JSON and publishes it ' +
      'to the notifications exchange. The call returns once RabbitMQ has ' +
      'confirmed receipt; transient errors are retried automatically.',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Event accepted for delivery',
  })
  async publish(
    @Body() dto: NotificationEventDto,
  ): Promise<EventEnvelope<NotificationEventDto>> {
    return this.service.publish(dto);
  }
}

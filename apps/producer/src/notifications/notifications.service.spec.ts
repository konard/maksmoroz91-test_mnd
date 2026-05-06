import { RabbitMQPublisherService } from '@app/common';

import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('delegates to publisher with default type when none provided', async () => {
    const publisher = {
      publish: jest.fn().mockResolvedValue({ id: '1' }),
    } as unknown as RabbitMQPublisherService;
    const service = new NotificationsService(publisher);

    await service.publish({ chatId: '42', message: 'hi' });

    expect(publisher.publish).toHaveBeenCalledWith('notification.send', {
      chatId: '42',
      message: 'hi',
    });
  });

  it('passes through provided event type', async () => {
    const publisher = {
      publish: jest.fn().mockResolvedValue({ id: '1' }),
    } as unknown as RabbitMQPublisherService;
    const service = new NotificationsService(publisher);

    await service.publish({
      chatId: '42',
      message: 'hi',
      type: 'system.alert',
    });

    expect(publisher.publish).toHaveBeenCalledWith('system.alert', {
      chatId: '42',
      message: 'hi',
      type: 'system.alert',
    });
  });
});

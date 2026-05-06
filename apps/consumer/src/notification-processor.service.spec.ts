import { RabbitMQConsumerService } from '@app/common';

import { NotificationProcessorService } from './notification-processor.service';

describe('NotificationProcessorService', () => {
  const buildConsumer = () =>
    ({
      subscribe: jest.fn().mockResolvedValue(undefined),
    }) as unknown as RabbitMQConsumerService;

  it('subscribes on init', async () => {
    const consumer = buildConsumer();
    const service = new NotificationProcessorService(consumer);

    await service.onModuleInit();

    expect(consumer.subscribe).toHaveBeenCalledWith(expect.any(Function));
  });

  it('throws on invalid payload so the consumer can retry/DLQ', async () => {
    const consumer = buildConsumer();
    const service = new NotificationProcessorService(consumer);
    let registered: any;
    (consumer.subscribe as jest.Mock).mockImplementation(async (handler) => {
      registered = handler;
    });
    await service.onModuleInit();

    await expect(
      registered({
        id: 'x',
        type: 't',
        occurredAt: '',
        payload: { chatId: '', message: '' },
      }),
    ).rejects.toThrow(/Invalid notification payload/);
  });
});

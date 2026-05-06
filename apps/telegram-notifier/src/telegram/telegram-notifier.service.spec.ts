import { RabbitMQConsumerService } from '@app/common';

import { TelegramClient } from './telegram.client';
import { TelegramNotifierService } from './telegram-notifier.service';

describe('TelegramNotifierService', () => {
  const consumer = {} as RabbitMQConsumerService;

  it('formats and forwards notifications to Telegram', async () => {
    const telegram = { sendMessage: jest.fn().mockResolvedValue(undefined) };
    const service = new TelegramNotifierService(
      consumer,
      telegram as unknown as TelegramClient,
    );

    await service.handle({
      id: 'evt-1',
      type: 'system.alert',
      occurredAt: '2025-01-01T00:00:00.000Z',
      payload: { chatId: '42', message: 'hi' },
    });

    expect(telegram.sendMessage).toHaveBeenCalledWith({
      chatId: '42',
      text: expect.stringContaining('hi'),
    });
    expect(telegram.sendMessage.mock.calls[0][0].text).toContain(
      '[system.alert]',
    );
  });

  it('throws on invalid payloads so the consumer can retry/DLQ', async () => {
    const telegram = { sendMessage: jest.fn() };
    const service = new TelegramNotifierService(
      consumer,
      telegram as unknown as TelegramClient,
    );

    await expect(
      service.handle({
        id: 'evt-2',
        type: 'x',
        occurredAt: '2025-01-01T00:00:00.000Z',
        payload: { chatId: '', message: '' },
      }),
    ).rejects.toThrow(/Invalid Telegram payload/);
    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });
});

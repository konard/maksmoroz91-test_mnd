import { RabbitMQPublisherService } from './rabbitmq-publisher.service';
import { RabbitMQConnection } from './rabbitmq.connection';
import { RabbitMQModuleOptions } from './rabbitmq.types';

describe('RabbitMQPublisherService', () => {
  const baseOptions: RabbitMQModuleOptions = {
    uri: 'amqp://localhost',
    exchange: 'test.exchange',
    routingKey: 'test.routing',
    publishRetries: 2,
    publishRetryDelayMs: 1,
  };

  const buildConnection = (publish: jest.Mock): RabbitMQConnection => {
    return {
      getOptions: () => baseOptions,
      getChannel: () => ({ publish }),
    } as unknown as RabbitMQConnection;
  };

  it('publishes JSON envelope with UUID and confirms', async () => {
    const publish = jest.fn().mockResolvedValue(true);
    const service = new RabbitMQPublisherService(buildConnection(publish));

    const envelope = await service.publish('event.type', { hello: 'world' });

    expect(envelope.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(envelope.type).toBe('event.type');
    expect(envelope.payload).toEqual({ hello: 'world' });
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(
      'test.exchange',
      'test.routing',
      envelope,
      expect.objectContaining({
        persistent: true,
        contentType: 'application/json',
        messageId: envelope.id,
        type: 'event.type',
      }),
    );
  });

  it('retries publish on transient errors and eventually succeeds', async () => {
    const publish = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(true);
    const service = new RabbitMQPublisherService(buildConnection(publish));

    const envelope = await service.publish('e', { ok: true });

    expect(publish).toHaveBeenCalledTimes(2);
    expect(envelope.payload).toEqual({ ok: true });
  });

  it('throws after exhausting retries', async () => {
    const publish = jest.fn().mockRejectedValue(new Error('fatal'));
    const service = new RabbitMQPublisherService(buildConnection(publish));

    await expect(service.publish('e', { ok: false })).rejects.toThrow('fatal');
    expect(publish).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});

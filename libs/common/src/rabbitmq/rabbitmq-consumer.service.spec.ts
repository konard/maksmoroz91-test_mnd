import type { ConsumeMessage } from 'amqplib';

import { RabbitMQConsumerService } from './rabbitmq-consumer.service';
import { RabbitMQConnection } from './rabbitmq.connection';

type Handler = Parameters<RabbitMQConsumerService['subscribe']>[0];

const buildMessage = (
  payload: unknown,
  attempts: number = 0,
): ConsumeMessage =>
  ({
    content: Buffer.from(JSON.stringify(payload), 'utf-8'),
    fields: {} as ConsumeMessage['fields'],
    properties: {
      headers: attempts
        ? { 'x-death': [{ count: attempts }] }
        : {},
    } as ConsumeMessage['properties'],
  }) as ConsumeMessage;

describe('RabbitMQConsumerService', () => {
  const buildConnection = (
    capture: { handler?: (msg: ConsumeMessage | null) => Promise<void> },
  ): { connection: RabbitMQConnection; channel: any } => {
    const channel = {
      ack: jest.fn(),
      nack: jest.fn(),
    };
    const wrapper = {
      addSetup: async (fn: (ch: any) => Promise<void>) => {
        await fn({
          ...channel,
          consume: async (
            _queue: string,
            cb: (msg: ConsumeMessage | null) => Promise<void>,
          ) => {
            capture.handler = cb;
          },
        });
      },
    };
    const connection = {
      getOptions: () => ({
        uri: 'amqp://x',
        exchange: 'x',
        queue: 'q',
        consumerMaxRetries: 2,
      }),
      getChannel: () => wrapper,
    } as unknown as RabbitMQConnection;
    return { connection, channel };
  };

  it('acks message after successful handling', async () => {
    const capture: { handler?: any } = {};
    const { connection, channel } = buildConnection(capture);
    const service = new RabbitMQConsumerService(connection);
    const handler: Handler = jest.fn().mockResolvedValue(undefined);

    await service.subscribe(handler);
    await capture.handler!(
      buildMessage({ id: 'a', type: 't', occurredAt: '', payload: {} }),
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(channel.ack).toHaveBeenCalledTimes(1);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('requeues message when handler throws and retries remain', async () => {
    const capture: { handler?: any } = {};
    const { connection, channel } = buildConnection(capture);
    const service = new RabbitMQConsumerService(connection);
    const handler: Handler = jest.fn().mockRejectedValue(new Error('fail'));

    await service.subscribe(handler);
    await capture.handler!(
      buildMessage({ id: 'a', type: 't', occurredAt: '', payload: {} }, 0),
    );

    expect(channel.nack).toHaveBeenCalledWith(expect.anything(), false, true);
  });

  it('sends to DLQ after max retries reached', async () => {
    const capture: { handler?: any } = {};
    const { connection, channel } = buildConnection(capture);
    const service = new RabbitMQConsumerService(connection);
    const handler: Handler = jest.fn().mockRejectedValue(new Error('fail'));

    await service.subscribe(handler);
    await capture.handler!(
      buildMessage({ id: 'a', type: 't', occurredAt: '', payload: {} }, 2),
    );

    expect(channel.nack).toHaveBeenCalledWith(expect.anything(), false, false);
  });

  it('rejects unparseable payloads without requeue', async () => {
    const capture: { handler?: any } = {};
    const { connection, channel } = buildConnection(capture);
    const service = new RabbitMQConsumerService(connection);
    const handler: Handler = jest.fn();

    await service.subscribe(handler);
    const broken: ConsumeMessage = {
      content: Buffer.from('not-json', 'utf-8'),
      fields: {} as ConsumeMessage['fields'],
      properties: { headers: {} } as ConsumeMessage['properties'],
    } as ConsumeMessage;
    await capture.handler!(broken);

    expect(handler).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(broken, false, false);
  });
});

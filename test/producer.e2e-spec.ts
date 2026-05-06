import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import {
  RabbitMQConnection,
  RabbitMQConsumerService,
  RabbitMQPublisherService,
} from '@app/common';

import { ProducerModule } from '../apps/producer/src/producer.module';

describe('Producer (e2e)', () => {
  let app: INestApplication;
  const publish = jest.fn().mockImplementation(async (type, payload) => ({
    id: 'fixed-uuid',
    type,
    occurredAt: '2025-01-01T00:00:00.000Z',
    payload,
  }));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ProducerModule],
    })
      .overrideProvider(RabbitMQConnection)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
      })
      .overrideProvider(RabbitMQPublisherService)
      .useValue({ publish })
      .overrideProvider(RabbitMQConsumerService)
      .useValue({ subscribe: jest.fn() })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('POST /notifications publishes and returns envelope', async () => {
    const response = await request(app.getHttpServer())
      .post('/notifications')
      .send({ chatId: '42', message: 'hi' })
      .expect(202);

    expect(response.body).toEqual({
      id: 'fixed-uuid',
      type: 'notification.send',
      occurredAt: '2025-01-01T00:00:00.000Z',
      payload: { chatId: '42', message: 'hi' },
    });
    expect(publish).toHaveBeenCalledWith('notification.send', {
      chatId: '42',
      message: 'hi',
    });
  });

  it('POST /notifications validates payload', async () => {
    await request(app.getHttpServer())
      .post('/notifications')
      .send({ chatId: '', message: '' })
      .expect(400);
  });
});

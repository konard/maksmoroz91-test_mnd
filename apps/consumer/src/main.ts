import { NestFactory } from '@nestjs/core';

import { ConsumerModule } from './consumer.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(ConsumerModule);
  app.enableShutdownHooks();
  // eslint-disable-next-line no-console
  console.log('Consumer service started');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Consumer failed to start', err);
  process.exit(1);
});

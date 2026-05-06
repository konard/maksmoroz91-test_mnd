import { NestFactory } from '@nestjs/core';

import { TelegramNotifierModule } from './telegram-notifier.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(TelegramNotifierModule);
  app.enableShutdownHooks();
  // eslint-disable-next-line no-console
  console.log('Telegram notifier started');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Telegram notifier failed to start', err);
  process.exit(1);
});

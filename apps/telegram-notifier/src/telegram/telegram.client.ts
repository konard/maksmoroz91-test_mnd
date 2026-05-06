import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface TelegramSendArgs {
  chatId: string;
  text: string;
}

@Injectable()
export class TelegramClient {
  private readonly logger = new Logger(TelegramClient.name);
  private readonly token: string;
  private readonly http: AxiosInstance;
  private readonly dryRun: boolean;

  constructor(config: ConfigService) {
    this.token = config.get<string>('TELEGRAM_BOT_TOKEN', '');
    this.dryRun = !this.token || config.get<string>('TELEGRAM_DRY_RUN') === 'true';
    const baseURL = config.get<string>(
      'TELEGRAM_API_BASE_URL',
      'https://api.telegram.org',
    );
    this.http = axios.create({
      baseURL,
      timeout: Number(config.get<number>('TELEGRAM_TIMEOUT_MS', 10000)),
    });
  }

  async sendMessage(args: TelegramSendArgs): Promise<void> {
    if (this.dryRun) {
      this.logger.warn(
        `TELEGRAM_BOT_TOKEN missing or dry-run enabled — message to chat ${args.chatId} not sent. Body: ${args.text}`,
      );
      return;
    }

    const url = `/bot${this.token}/sendMessage`;
    const response = await this.http.post(url, {
      chat_id: args.chatId,
      text: args.text,
    });

    if (response.data?.ok !== true) {
      throw new Error(
        `Telegram API error: ${JSON.stringify(response.data)}`,
      );
    }
  }
}

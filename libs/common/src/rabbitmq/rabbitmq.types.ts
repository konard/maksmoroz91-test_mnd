import type { ConsumeMessage } from 'amqplib';

export interface RabbitMQModuleOptions {
  uri: string;
  exchange: string;
  queue?: string;
  routingKey?: string;
  deadLetterExchange?: string;
  deadLetterQueue?: string;
  deadLetterRoutingKey?: string;
  prefetch?: number;
  publishRetries?: number;
  publishRetryDelayMs?: number;
  consumerMaxRetries?: number;
}

export type MessageHandler = (
  payload: unknown,
  raw: ConsumeMessage,
) => Promise<void> | void;

export const RABBITMQ_CONNECTION = 'RABBITMQ_CONNECTION';
export const RABBITMQ_OPTIONS = 'RABBITMQ_OPTIONS';

export const NOTIFICATION_EXCHANGE = 'notifications.exchange';
export const NOTIFICATION_ROUTING_KEY = 'notifications.send';
export const NOTIFICATION_QUEUE = 'notifications.queue';

export const NOTIFICATION_DLX = 'notifications.dlx';
export const NOTIFICATION_DLQ = 'notifications.dlq';
export const NOTIFICATION_DLQ_ROUTING_KEY = 'notifications.dead';

export const DEFAULT_PUBLISH_RETRIES = 5;
export const DEFAULT_PUBLISH_RETRY_DELAY_MS = 500;
export const DEFAULT_CONSUMER_MAX_RETRIES = 3;

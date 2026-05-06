# test_mnd — Nest.js microservices with RabbitMQ and Telegram

A minimal microservice stack that demonstrates the requirements from issue
[maksmoroz91/test_mnd#1](https://github.com/maksmoroz91/test_mnd/issues/1):

- **Producer** — REST API that publishes notification events to RabbitMQ. Each
  event gets a UUID for idempotency, is serialised as JSON, is sent with
  publisher confirms, and is retried on transient errors.
- **Consumer** — sample worker that reads events from RabbitMQ, manually acks
  successful processing, retries failures, and routes terminally-failed
  messages to a dead-letter queue.
- **Telegram notifier** — a second consumer that turns events into messages and
  delivers them via the Telegram Bot API (with a dry-run mode for local
  development without a real bot).

The project follows Nest.js modular architecture, dependency inversion, and
clean architecture conventions: each app owns its bootstrap and feature
modules, while shared transport and DTO code lives in `libs/common`.

## Project layout

```
apps/
  producer/              REST API → publishes to RabbitMQ
  consumer/              Generic background worker (logs + DLQ)
  telegram-notifier/     Worker that delivers events to Telegram
libs/
  common/                Shared RabbitMQ module, DTOs, event envelope
test/                    e2e tests
docker-compose.yml       RabbitMQ + the three apps
Dockerfile               Multi-stage build, parameterised via APP arg
```

## Local development

```bash
# Install dependencies
npm install

# Start a local RabbitMQ (via docker-compose)
docker compose up -d rabbitmq

# In separate terminals
npm run start:producer
npm run start:consumer
npm run start:telegram-notifier
```

The producer listens on `http://localhost:3000` by default, with Swagger UI at
`http://localhost:3000/docs`.

Publish an event:

```bash
curl -X POST http://localhost:3000/notifications \
  -H 'Content-Type: application/json' \
  -d '{"chatId":"123456789","message":"Hello from the producer","type":"system.alert"}'
```

The response includes the generated UUID, type, timestamp and payload.

## Running everything in Docker

```bash
cp .env.example .env
# (optional) edit TELEGRAM_BOT_TOKEN and set TELEGRAM_DRY_RUN=false
docker compose up --build
```

This brings up RabbitMQ (with the management UI on
`http://localhost:15672`, login `guest`/`guest`) plus all three services.

## Configuration

All services read config from environment variables (see `.env.example`):

| Variable                  | Default                                  | Description                                           |
| ------------------------- | ---------------------------------------- | ----------------------------------------------------- |
| `RABBITMQ_URI`            | `amqp://guest:guest@localhost:5672`      | Broker URL used by every service                      |
| `PRODUCER_PORT`           | `3000`                                   | HTTP port for the producer service                    |
| `PUBLISH_RETRIES`         | `5`                                      | Producer publish retry attempts                       |
| `PUBLISH_RETRY_DELAY_MS`  | `500`                                    | Linear backoff between publish retries                |
| `CONSUMER_PREFETCH`       | `10`                                     | Consumer prefetch count                               |
| `CONSUMER_MAX_RETRIES`    | `3`                                      | Times an event is requeued before going to the DLQ    |
| `TELEGRAM_BOT_TOKEN`      | _(empty)_                                | Token from BotFather; empty enables dry-run logging   |
| `TELEGRAM_DRY_RUN`        | `true`                                   | If `true`, log the message instead of calling the API |
| `TELEGRAM_API_BASE_URL`   | `https://api.telegram.org`               | Override for tests/proxies                            |

## Reliability features

- **Idempotency** — every event is wrapped in an `EventEnvelope` with a UUID
  used as `messageId`. Downstream consumers can deduplicate using it.
- **Publisher confirms** — the publisher uses
  [`amqp-connection-manager`](https://www.npmjs.com/package/amqp-connection-manager)
  with `json: true` and confirm channels, so `publish` only resolves once
  RabbitMQ has acknowledged the message.
- **Publish retries** — transient broker errors are retried with linear
  backoff (`PUBLISH_RETRIES` × `PUBLISH_RETRY_DELAY_MS`).
- **Manual acks on the consumer** — successful processing acks the message,
  failures `nack` with requeue until `CONSUMER_MAX_RETRIES` is reached, after
  which the message is sent to the dead-letter exchange/queue.
- **Auto-reconnect** — connections recover automatically after broker
  restarts; topology (exchange/queue/DLX bindings) is reasserted on every
  reconnect via `setup`/`addSetup` hooks.
- **Structured logging** — every publish/consume operation emits a Nest
  `Logger` line with the event id and outcome.

## Tests

```bash
npm test          # unit tests (publisher retry, consumer retry/DLQ, etc.)
npm run test:e2e  # producer HTTP layer with mocked RabbitMQ
```

13 unit tests + 2 e2e tests cover:

- publisher confirm + retry-on-error + retry exhaustion
- consumer ack on success, requeue while retries remain, DLQ after max,
  rejection of non-JSON payloads
- producer service / controller wiring and validation
- Telegram notifier formatting and payload validation

## Swagger

Swagger UI is mounted at `/docs` on the producer service and documents the
`POST /notifications` endpoint, including the `NotificationEventDto` schema.

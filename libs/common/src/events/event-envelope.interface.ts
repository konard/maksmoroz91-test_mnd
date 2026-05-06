export interface EventEnvelope<TPayload = unknown> {
  id: string;
  type: string;
  occurredAt: string;
  payload: TPayload;
}

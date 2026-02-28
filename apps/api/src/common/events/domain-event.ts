export interface DomainEvent<
  TPayload extends object = Record<string, unknown>,
> {
  id: string;
  aggregate: string;
  type: string;
  occurredAt: string;
  payload: TPayload;
}

export function createDomainEvent<TPayload extends object>(params: {
  aggregate: string;
  type: string;
  payload: TPayload;
}): DomainEvent<TPayload> {
  return {
    id: crypto.randomUUID(),
    aggregate: params.aggregate,
    type: params.type,
    occurredAt: new Date().toISOString(),
    payload: params.payload,
  };
}

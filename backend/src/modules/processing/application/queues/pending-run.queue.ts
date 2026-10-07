export const PENDING_RUN_QUEUE = Symbol('PENDING_RUN_QUEUE');

export interface PendingRunInput {
  runId: string;
  seq: number;
  sku: string;
}

export interface PendingRunQueue {
  enqueue(input: PendingRunInput): Promise<void>;
}

export interface CallbackQueue {
  enqueue(runId: string): Promise<void>;
}

export const CALLBACK_QUEUE = Symbol('CALLBACK_QUEUE');

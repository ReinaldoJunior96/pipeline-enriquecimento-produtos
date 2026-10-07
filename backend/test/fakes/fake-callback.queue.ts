import { CallbackQueue } from '../../src/modules/callback/application/contracts/callback.queue.js';

export class FakeCallbackQueue implements CallbackQueue {
  readonly runIds: string[] = [];

  async enqueue(runId: string): Promise<void> {
    this.runIds.push(runId);
  }
}

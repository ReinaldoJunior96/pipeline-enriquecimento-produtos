import { CallbackQueue } from '../../src/modules/callback/application/contracts/callback.queue.js';

export class FakeCallbackQueue implements CallbackQueue {
  readonly runIds: string[] = [];

  async enqueue(runId: string): Promise<void> {
    if (!this.runIds.includes(runId)) this.runIds.push(runId);
  }
}

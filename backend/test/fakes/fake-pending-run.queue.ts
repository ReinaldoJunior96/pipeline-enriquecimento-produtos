import {
  PendingRunInput,
  PendingRunQueue,
} from '../../src/modules/processing/application/queues/pending-run.queue.js';

export class FakePendingRunQueue implements PendingRunQueue {
  readonly itens: PendingRunInput[] = [];

  async enqueue(input: PendingRunInput): Promise<void> {
    this.itens.push(input);
  }
}

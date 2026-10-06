import { ProcessingQueue } from '../../src/modules/processing/application/queues/processing.queue.js';
import { ProcessItemInput } from '../../src/modules/processing/domain/repositories/process-item.repository.js';

export class FakeProcessingQueue implements ProcessingQueue {
  readonly itens: ProcessItemInput[] = [];

  async enqueue(item: ProcessItemInput): Promise<void> {
    this.itens.push(item);
  }
}

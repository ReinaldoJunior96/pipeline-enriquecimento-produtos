import { ProcessingQueue } from '../../application/queues/processing.queue.js';
import { ProcessItemInput } from '../../domain/repositories/process-item.repository.js';

export class InMemoryProcessingQueue implements ProcessingQueue {
  private readonly itens: ProcessItemInput[] = [];

  async enqueue(item: ProcessItemInput): Promise<void> {
    this.itens.push(item);
  }
}

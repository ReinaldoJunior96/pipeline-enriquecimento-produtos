import { ProcessingQueue } from '../../src/modules/processing/application/queues/processing.queue.js';
import { ProcessItemInput } from '../../src/modules/processing/domain/repositories/process-item.repository.js';

export class FakeProcessingQueue implements ProcessingQueue {
  readonly itens: ProcessItemInput[] = [];

  async enqueue(item: ProcessItemInput): Promise<void> {
    const jaExiste = this.itens.some(
      (existente) =>
        existente.runId === item.runId && existente.seq === item.seq,
    );
    if (!jaExiste) this.itens.push(item);
  }
}

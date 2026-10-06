import {
  ProcessItemInput,
  ProcessItemRepository,
} from '../../src/modules/processing/domain/repositories/process-item.repository.js';

export class FakeProcessItemRepository implements ProcessItemRepository {
  readonly itens: ProcessItemInput[] = [];

  async exists(runId: string, seq: number): Promise<boolean> {
    return this.itens.some((item) => item.runId === runId && item.seq === seq);
  }

  async register(item: ProcessItemInput): Promise<void> {
    this.itens.push(item);
  }
}

import {
  ProcessItemInput,
  ProcessItemRepository,
} from '../../src/modules/processing/domain/repositories/process-item.repository.js';

export class FakeProcessItemRepository implements ProcessItemRepository {
  readonly itens: ProcessItemInput[] = [];

  async registerIfNew(item: ProcessItemInput): Promise<{ created: boolean }> {
    const duplicado = this.itens.some(
      (existente) =>
        existente.runId === item.runId && existente.seq === item.seq,
    );

    if (duplicado) {
      return { created: false };
    }

    this.itens.push(item);
    return { created: true };
  }
}

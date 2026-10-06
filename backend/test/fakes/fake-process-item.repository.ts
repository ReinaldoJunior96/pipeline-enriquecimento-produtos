import {
  MarkProcessItemErrorInput,
  MarkProcessItemSuccessInput,
  ProcessItem,
  ProcessItemInput,
  ProcessItemRepository,
} from '../../src/modules/processing/domain/repositories/process-item.repository.js';

export class FakeProcessItemRepository implements ProcessItemRepository {
  readonly itens: ProcessItemInput[] = [];
  private readonly estados = new Map<string, ProcessItem>();

  async registerIfNew(item: ProcessItemInput): Promise<{ created: boolean }> {
    const duplicado = this.itens.some(
      (existente) =>
        existente.runId === item.runId && existente.seq === item.seq,
    );

    if (duplicado) {
      return { created: false };
    }

    this.itens.push(item);
    this.estados.set(this.chave(item.runId, item.seq), {
      ...item,
      status: 'PENDING',
      attempts: 0,
      price: null,
      stock: null,
      errorCode: null,
      errorMessage: null,
    });
    return { created: true };
  }

  async findByRunIdAndSeq(
    runId: string,
    seq: number,
  ): Promise<ProcessItem | null> {
    return this.estados.get(this.chave(runId, seq)) ?? null;
  }

  async markProcessing(runId: string, seq: number): Promise<boolean> {
    const item = this.estados.get(this.chave(runId, seq));
    if (!item || !['PENDING', 'PROCESSING'].includes(item.status)) return false;

    item.status = 'PROCESSING';
    item.attempts += 1;
    return true;
  }

  async markSuccess(input: MarkProcessItemSuccessInput): Promise<boolean> {
    const item = this.estados.get(this.chave(input.runId, input.seq));
    if (!item || item.status !== 'PROCESSING') return false;

    Object.assign(item, {
      status: 'SUCCESS',
      price: input.price,
      stock: input.stock,
      errorCode: null,
      errorMessage: null,
    });
    return true;
  }

  async markError(input: MarkProcessItemErrorInput): Promise<boolean> {
    const item = this.estados.get(this.chave(input.runId, input.seq));
    if (!item || item.status !== 'PROCESSING') return false;

    Object.assign(item, {
      status: 'ERROR',
      price: null,
      stock: null,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
    });
    return true;
  }

  private chave(runId: string, seq: number): string {
    return `${runId}:${seq}`;
  }
}

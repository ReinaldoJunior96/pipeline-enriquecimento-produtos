import {
  MarkProcessItemErrorInput,
  MarkProcessItemSuccessInput,
  ProcessItem,
  ProcessItemInput,
  ProcessItemRepository,
} from '../../src/modules/processing/domain/repositories/process-item.repository.js';

export class FakeProcessItemRepository implements ProcessItemRepository {
  readonly itens: ProcessItemInput[] = [];
  readonly finishedCountPorRun = new Map<string, number>();
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
    this.incrementarFinishedCount(input.runId);
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
    this.incrementarFinishedCount(input.runId);
    return true;
  }

  private incrementarFinishedCount(runId: string): void {
    this.finishedCountPorRun.set(
      runId,
      (this.finishedCountPorRun.get(runId) ?? 0) + 1,
    );
  }

  private chave(runId: string, seq: number): string {
    return `${runId}:${seq}`;
  }
}

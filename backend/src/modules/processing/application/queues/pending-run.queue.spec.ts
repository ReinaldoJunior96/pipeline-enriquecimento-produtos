import {
  PendingRunInput,
  PendingRunQueue,
} from './pending-run.queue.js';

class FakePendingRunQueue implements PendingRunQueue {
  readonly itens: PendingRunInput[] = [];

  async enqueue(input: PendingRunInput): Promise<void> {
    this.itens.push(input);
  }
}

describe('Contrato da fila de espera por lote', () => {
  it('deve aceitar um item para aguardar a criação do lote', async () => {
    const fila = new FakePendingRunQueue();
    const item = { runId: 'run_abc123', seq: 1, sku: 'sku-001' };

    await fila.enqueue(item);

    expect(fila.itens).toEqual([item]);
  });
});

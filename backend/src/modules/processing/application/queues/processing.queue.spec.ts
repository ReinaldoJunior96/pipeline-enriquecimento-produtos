import { FakeProcessingQueue } from '../../../../../test/fakes/fake-processing.queue.js';
import { ProcessingQueue } from './processing.queue.js';

describe('Contrato da fila de processamento', () => {
  it('deve enfileirar o item recebido', async () => {
    const fila: ProcessingQueue = new FakeProcessingQueue();
    const item = {
      runId: 'run_abc123',
      seq: 0,
      sku: 'sku-001',
    };

    await fila.enqueue(item);

    expect(fila.itens).toEqual([item]);
  });
});

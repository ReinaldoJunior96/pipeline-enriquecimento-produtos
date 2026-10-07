import { Queue } from 'bullmq';
import { BullMqProcessingQueue } from './bullmq-processing.queue.js';

describe('BullMqProcessingQueue', () => {
  it('deve adicionar um job process-item com o payload recebido', async () => {
    const adicionar = vi.fn().mockResolvedValue(undefined);
    const fila = { add: adicionar } as unknown as Queue;
    const processingQueue = new BullMqProcessingQueue(fila);
    const item = {
      runId: 'run_queue_test',
      seq: 1,
      sku: 'sku-001',
    };

    await processingQueue.enqueue(item);

    expect(adicionar).toHaveBeenCalledOnce();
    expect(adicionar).toHaveBeenCalledWith('process-item', item, {
      jobId: 'run_queue_test-1',
      attempts: 3,
      backoff: { type: 'processing' },
    });
  });

  it('deve usar jobId determinístico em enqueues repetidos do mesmo item', async () => {
    const adicionar = vi.fn().mockResolvedValue(undefined);
    const fila = { add: adicionar } as unknown as Queue;
    const processingQueue = new BullMqProcessingQueue(fila);
    const item = { runId: 'run-idempotente', seq: 4, sku: 'sku-004' };

    await processingQueue.enqueue(item);
    await processingQueue.enqueue(item);

    expect(adicionar).toHaveBeenCalledTimes(2);
    expect(adicionar.mock.calls.map(([, , opcoes]) => opcoes)).toEqual([
      expect.objectContaining({ jobId: 'run-idempotente-4' }),
      expect.objectContaining({ jobId: 'run-idempotente-4' }),
    ]);
  });
});

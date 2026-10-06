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
    });
  });
});

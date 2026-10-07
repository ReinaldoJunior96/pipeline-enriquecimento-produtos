import { Queue } from 'bullmq';
import { BullMqPendingRunQueue } from './bullmq-pending-run.queue.js';

describe('BullMqPendingRunQueue', () => {
  it('deve adicionar um job idempotente com retry curto', async () => {
    const adicionar = vi.fn().mockResolvedValue(undefined);
    const fila = { add: adicionar } as unknown as Queue;
    const pendingRunQueue = new BullMqPendingRunQueue(fila);
    const item = {
      runId: 'run_queue_test',
      seq: 1,
      sku: 'sku-001',
    };

    await pendingRunQueue.enqueue(item);

    expect(adicionar).toHaveBeenCalledOnce();
    expect(adicionar).toHaveBeenCalledWith('wait-for-run', item, {
      jobId: 'wait-run_queue_test-1',
      attempts: 10,
      backoff: { type: 'fixed', delay: 500 },
    });
  });
});

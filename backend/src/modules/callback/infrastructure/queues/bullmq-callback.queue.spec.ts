import { Queue } from 'bullmq';
import { BullMqCallbackQueue } from './bullmq-callback.queue.js';

describe('BullMqCallbackQueue', () => {
  it('deve enfileirar somente o runId com jobId estável por run', async () => {
    const adicionar = vi.fn().mockResolvedValue(undefined);
    const fila = { add: adicionar } as unknown as Queue;
    const callbackQueue = new BullMqCallbackQueue(fila);

    await callbackQueue.enqueue('run-callback-1');

    expect(adicionar).toHaveBeenCalledWith(
      'send-result',
      { runId: 'run-callback-1' },
      { jobId: 'callback-run-callback-1' },
    );
  });
});

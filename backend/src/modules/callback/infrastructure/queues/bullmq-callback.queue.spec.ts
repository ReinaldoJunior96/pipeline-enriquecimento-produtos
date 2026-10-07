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

  it('deve usar o mesmo jobId em chamadas repetidas para deduplicação do BullMQ', async () => {
    const adicionar = vi.fn().mockResolvedValue(undefined);
    const callbackQueue = new BullMqCallbackQueue(
      { add: adicionar } as unknown as Queue,
    );

    await Promise.all([
      callbackQueue.enqueue('run-duplicada'),
      callbackQueue.enqueue('run-duplicada'),
    ]);

    expect(adicionar).toHaveBeenCalledTimes(2);
    expect(adicionar.mock.calls[0]?.[2]).toEqual({
      jobId: 'callback-run-duplicada',
    });
    expect(adicionar.mock.calls[1]?.[2]).toEqual({
      jobId: 'callback-run-duplicada',
    });
  });
});

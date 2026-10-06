import { Queue } from 'bullmq';
import { ProcessItemInput } from '../../../src/modules/processing/domain/repositories/process-item.repository.js';
import { BullMqProcessingQueue } from '../../../src/modules/processing/infrastructure/queues/bullmq-processing.queue.js';

describe('BullMqProcessingQueue com Redis', () => {
  const nomeFila = 'processing-integration';
  let fila: Queue<ProcessItemInput>;

  beforeAll(() => {
    fila = new Queue<ProcessItemInput>(nomeFila, {
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    });
  });

  beforeEach(async () => {
    await fila.obliterate({ force: true });
  });

  afterAll(async () => {
    await fila.obliterate({ force: true });
    await fila.close();
  });

  it('deve manter no Redis um job com nome, payload e identidade esperados', async () => {
    const processingQueue = new BullMqProcessingQueue(fila);
    const item = {
      runId: 'run_queue_test',
      seq: 1,
      sku: 'sku-001',
    };

    await processingQueue.enqueue(item);

    const jobs = await fila.getJobs(['waiting']);

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toEqual(
      expect.objectContaining({
        id: 'run_queue_test-1',
        name: 'process-item',
        data: item,
      }),
    );
  });
});

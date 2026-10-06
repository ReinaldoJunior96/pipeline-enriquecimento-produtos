import { Job } from 'bullmq';
import { ProcessarItemUseCase } from '../../application/use-cases/processar-item.use-case.js';
import { ProcessItemInput } from '../../domain/repositories/process-item.repository.js';
import { ProcessingWorker } from './processing.worker.js';

describe('ProcessingWorker', () => {
  it('deve delegar o job process-item ao caso de uso', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const casoDeUso = { execute } as unknown as ProcessarItemUseCase;
    const worker = new ProcessingWorker(casoDeUso);
    const data = { runId: 'run_worker', seq: 0, sku: 'sku-worker' };
    const job = { name: 'process-item', data } as Job<ProcessItemInput>;

    await worker.process(job);

    expect(execute).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledWith(data);
  });
});

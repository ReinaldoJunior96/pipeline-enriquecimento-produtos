import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ProcessarItemAguardandoRunUseCase } from '../../application/use-cases/processar-item-aguardando-run.use-case.js';
import { RunNotAvailableError } from '../../domain/errors/run-not-available.error.js';
import { PendingRunWorker } from './pending-run.worker.js';

describe('PendingRunWorker', () => {
  it('deve falhar e registrar o esgotamento da espera na última tentativa', async () => {
    const item = { runId: 'run_inexistente', seq: 1, sku: 'sku-001' };
    const executar = vi
      .fn()
      .mockRejectedValue(new RunNotAvailableError(item.runId));
    const casoDeUso = {
      execute: executar,
    } as unknown as ProcessarItemAguardandoRunUseCase;
    const worker = new PendingRunWorker(casoDeUso);
    const logarErro = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const job = {
      name: 'wait-for-run',
      data: item,
      attemptsMade: 9,
      opts: { attempts: 10 },
    } as Job<typeof item>;

    await expect(worker.process(job)).rejects.toBeInstanceOf(
      RunNotAvailableError,
    );
    expect(executar).toHaveBeenCalledWith(item, 10);
    expect(logarErro).toHaveBeenCalledWith({
      evento: 'process.espera_esgotada',
      ...item,
      tentativa: 10,
    });
  });
});

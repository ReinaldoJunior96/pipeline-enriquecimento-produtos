import { Job, UnrecoverableError } from 'bullmq';
import {
  CallbackHttpError,
  CallbackOutcomeUnknownError,
} from '../../domain/errors/callback.errors.js';
import { EnviarCallbackRunUseCase } from '../../application/use-cases/enviar-callback-run.use-case.js';
import { SEND_RESULT_JOB_NAME } from '../queues/callback-queue.constants.js';
import { CallbackWorker } from './callback.worker.js';

describe('CallbackWorker', () => {
  function criarJob(runId = 'run-callback-worker') {
    return {
      name: SEND_RESULT_JOB_NAME,
      data: { runId },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<{ runId: string }>;
  }

  it('deve tornar resultado ambíguo irrecuperável para impedir retry cego', async () => {
    const execute = vi.fn().mockRejectedValue(new CallbackOutcomeUnknownError());
    const worker = new CallbackWorker({ execute } as unknown as EnviarCallbackRunUseCase);

    await expect(worker.process(criarJob())).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
    expect(execute).toHaveBeenCalledWith('run-callback-worker');
  });

  it('não deve repetir automaticamente erros explícitos 401/403', async () => {
    const execute = vi.fn().mockRejectedValue(new CallbackHttpError(401));
    const worker = new CallbackWorker({ execute } as unknown as EnviarCallbackRunUseCase);

    await expect(worker.process(criarJob())).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
  });

  it('deve deixar falhas explícitas 5xx para o retry limitado da fila', async () => {
    const erro = new CallbackHttpError(500);
    const execute = vi.fn().mockRejectedValue(erro);
    const worker = new CallbackWorker({ execute } as unknown as EnviarCallbackRunUseCase);

    await expect(worker.process(criarJob())).rejects.toBe(erro);
  });

  it('deve rejeitar jobs com nome desconhecido', async () => {
    const worker = new CallbackWorker({ execute: vi.fn() } as unknown as EnviarCallbackRunUseCase);

    await expect(
      worker.process({ ...criarJob(), name: 'outro-job' } as Job<{ runId: string }>),
    ).rejects.toThrow('Job de callback desconhecido');
  });
});

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EnviarCallbackRunUseCase } from '../../application/use-cases/enviar-callback-run.use-case.js';
import {
  CallbackCredentialsMismatchError,
  CallbackHttpError,
  CallbackOutcomeUnknownError,
  CallbackStatePersistenceError,
} from '../../domain/errors/callback.errors.js';
import {
  CALLBACK_QUEUE_NAME,
  SEND_RESULT_JOB_NAME,
} from '../queues/callback-queue.constants.js';
import { callbackBackoffStrategy } from './callback-backoff.strategy.js';

@Processor(CALLBACK_QUEUE_NAME, {
  concurrency: 1,
  settings: { backoffStrategy: callbackBackoffStrategy },
})
export class CallbackWorker extends WorkerHost {
  private readonly logger = new Logger(CallbackWorker.name);

  constructor(private readonly enviarCallback: EnviarCallbackRunUseCase) {
    super();
  }

  async process(job: Job<{ runId: string }>): Promise<void> {
    if (job.name !== SEND_RESULT_JOB_NAME) {
      throw new UnrecoverableError(`Job de callback desconhecido: ${job.name}`);
    }

    try {
      await this.enviarCallback.execute(job.data.runId);
    } catch (error) {
      if (error instanceof CallbackOutcomeUnknownError) {
        this.logger.error({
          evento: 'callback.resultado_incerto',
          runId: job.data.runId,
        });
        throw new UnrecoverableError(error.message);
      }

      if (error instanceof CallbackStatePersistenceError) {
        this.logger.error({
          evento: 'callback.estado_local_inconsistente',
          runId: job.data.runId,
        });
        throw new UnrecoverableError(error.message);
      }

      if (error instanceof CallbackCredentialsMismatchError) {
        throw new UnrecoverableError(error.message);
      }

      if (error instanceof CallbackHttpError) {
        if (error.status >= 500 && error.status < 600) {
          this.logger.error({
            evento: 'callback.resultado_incerto',
            runId: job.data.runId,
            status: error.status,
          });
          throw new UnrecoverableError(
            'Resultado do callback incerto após resposta HTTP 5xx',
          );
        }
        if (error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw new UnrecoverableError(error.message);
        }
        if (error.status < 400 || error.status >= 600) {
          throw new UnrecoverableError(error.message);
        }
      }

      throw error;
    }
  }
}

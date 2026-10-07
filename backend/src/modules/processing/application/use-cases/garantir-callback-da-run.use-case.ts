import { CallbackQueue } from '../../../callback/application/contracts/callback.queue.js';
import { RunRepository } from '../../../runs/domain/repositories/run.repository.js';

export class GarantirCallbackDaRunUseCase {
  constructor(
    private readonly runs: Pick<RunRepository, 'findById'>,
    private readonly callbackQueue: CallbackQueue,
  ) {}

  async execute(runId: string, concluidaAgora = false): Promise<void> {
    const run = await this.runs.findById(runId);
    if (!run) throw new Error(`Run ${runId} não encontrada`);
    if (run.callbackSent) return;
    if (run.finishedCount > run.total) {
      throw new Error(
        `Contador de itens finalizados inconsistente para a run ${runId}`,
      );
    }
    if (!concluidaAgora && run.finishedCount < run.total) return;

    await this.callbackQueue.enqueue(runId);
  }
}

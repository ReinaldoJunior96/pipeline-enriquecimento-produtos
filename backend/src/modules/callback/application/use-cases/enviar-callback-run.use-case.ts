import { Logger } from '@nestjs/common';
import { PlatformAuthContextStore } from '../../../platform-auth/application/contracts/platform-auth-context.store.js';
import { RunRepository } from '../../../runs/domain/repositories/run.repository.js';
import { CallbackClient } from '../contracts/callback.client.js';
import {
  CallbackAuthContextNotFoundError,
  CallbackCredentialsMismatchError,
  CallbackStatePersistenceError,
} from '../../domain/errors/callback.errors.js';
import { ConsolidarResultadoRunUseCase } from './consolidar-resultado-run.use-case.js';

export class EnviarCallbackRunUseCase {
  private readonly logger = new Logger(EnviarCallbackRunUseCase.name);

  constructor(
    private readonly runs: RunRepository,
    private readonly consolidarResultado: ConsolidarResultadoRunUseCase,
    private readonly authContextStore: PlatformAuthContextStore,
    private readonly callbackClient: CallbackClient,
  ) {}

  async execute(runId: string): Promise<void> {
    const run = await this.runs.findById(runId);
    if (!run) throw new Error(`Run ${runId} não encontrada`);

    if (run.callbackSent) {
      this.logger.log({ evento: 'callback.ja_enviado', runId, cid: run.cid });
      return;
    }

    if (run.finishedCount > run.total) {
      throw new Error(
        `Contador de itens finalizados inconsistente para a run ${runId}`,
      );
    }
    if (run.finishedCount !== run.total) {
      throw new Error(`A run ${runId} ainda não está pronta para callback`);
    }

    const credenciais = await this.authContextStore.getForRun(runId);
    if (!credenciais) throw new CallbackAuthContextNotFoundError(runId);
    if (credenciais.cid !== run.cid) {
      throw new CallbackCredentialsMismatchError(runId);
    }

    this.logger.log({ evento: 'callback.iniciado', runId, cid: run.cid });
    const payload = await this.consolidarResultado.execute(runId);
    await this.callbackClient.sendCallback({
      token: credenciais.token,
      payload,
    });

    let atualizado: boolean;
    try {
      atualizado = await this.runs.markCallbackSent(runId);
    } catch {
      throw new CallbackStatePersistenceError();
    }
    if (!atualizado) throw new CallbackStatePersistenceError();

    await this.authContextStore.deleteForRun(runId);
    this.logger.log({ evento: 'callback.sucesso', runId, cid: run.cid });
  }
}

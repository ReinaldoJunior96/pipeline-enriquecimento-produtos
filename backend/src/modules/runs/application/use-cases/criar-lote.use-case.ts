import { Logger } from '@nestjs/common';
import {
  CriarLoteNaPlataformaInput,
  PlataformaExternaClient,
} from '../contracts/plataforma-externa.client.js';
import {
  Run,
  RunRepository,
} from '../../domain/repositories/run.repository.js';
import { PlatformAuthContextStore } from '../../../platform-auth/application/contracts/platform-auth-context.store.js';

export class CriarLoteUseCase {
  private readonly logger = new Logger(CriarLoteUseCase.name);

  constructor(
    private readonly plataformaExternaClient: PlataformaExternaClient,
    private readonly runRepository: RunRepository,
    private readonly platformAuthContextStore: PlatformAuthContextStore,
  ) {}

  async execute(input: CriarLoteNaPlataformaInput): Promise<Run> {
    const loteExterno = await this.plataformaExternaClient.criarLote(input);
    const run = await this.runRepository.create({
      runId: loteExterno.runId,
      cid: loteExterno.cid,
      total: loteExterno.total,
      startedAt: loteExterno.startedAt,
    });
    try {
      await this.platformAuthContextStore.saveForRun({
        runId: loteExterno.runId,
        cid: loteExterno.cid,
        token: input.token,
      });
    } catch (erro) {
      this.logger.error({
        evento: 'auth_context.falha_ao_salvar_apos_burst',
        runId: loteExterno.runId,
        cid: loteExterno.cid,
      });
      throw erro;
    }
    return run;
  }
}

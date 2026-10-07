import {
  CriarLoteNaPlataformaInput,
  PlataformaExternaClient,
} from '../contracts/plataforma-externa.client.js';
import {
  Run,
  RunRepository,
} from '../../domain/repositories/run.repository.js';
import { CredenciaisLoteStore } from '../contracts/credenciais-lote.store.js';

export class CriarLoteUseCase {
  constructor(
    private readonly plataformaExternaClient: PlataformaExternaClient,
    private readonly runRepository: RunRepository,
    private readonly credenciaisLoteStore?: CredenciaisLoteStore,
  ) {}

  async execute(input: CriarLoteNaPlataformaInput): Promise<Run> {
    const loteExterno = await this.plataformaExternaClient.criarLote(input);
    this.credenciaisLoteStore?.definir(loteExterno.runId, {
      cid: loteExterno.cid,
      token: input.token,
    });

    try {
      return await this.runRepository.create({
        runId: loteExterno.runId,
        cid: loteExterno.cid,
        total: loteExterno.total,
        startedAt: loteExterno.startedAt,
      });
    } catch (error) {
      this.credenciaisLoteStore?.remover(loteExterno.runId);
      throw error;
    }
  }
}

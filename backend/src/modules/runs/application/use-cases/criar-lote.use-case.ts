import {
  CriarLoteNaPlataformaInput,
  PlataformaExternaClient,
} from '../contracts/plataforma-externa.client.js';
import {
  Run,
  RunRepository,
} from '../../domain/repositories/run.repository.js';

export class CriarLoteUseCase {
  constructor(
    private readonly plataformaExternaClient: PlataformaExternaClient,
    private readonly runRepository: RunRepository,
  ) {}

  async execute(input: CriarLoteNaPlataformaInput): Promise<Run> {
    const loteExterno = await this.plataformaExternaClient.criarLote(input);

    return this.runRepository.create({
      runId: loteExterno.runId,
      cid: loteExterno.cid,
      total: loteExterno.total,
      startedAt: loteExterno.startedAt,
    });
  }
}

import {
  CriarLoteNaPlataformaInput,
  LoteCriadoNaPlataforma,
  PlataformaExternaClient,
} from '../../src/modules/runs/application/contracts/plataforma-externa.client.js';

export class FakePlataformaExternaClient implements PlataformaExternaClient {
  readonly chamadas: CriarLoteNaPlataformaInput[] = [];

  constructor(private readonly resposta: LoteCriadoNaPlataforma) {}

  async criarLote(
    input: CriarLoteNaPlataformaInput,
  ): Promise<LoteCriadoNaPlataforma> {
    this.chamadas.push(input);
    return this.resposta;
  }
}

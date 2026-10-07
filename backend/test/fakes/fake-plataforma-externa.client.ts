import {
  CriarLoteNaPlataformaInput,
  CredenciaisDaPlataforma,
  LoteCriadoNaPlataforma,
  PlataformaExternaClient,
  RegistrarNaPlataformaInput,
} from '../../src/modules/runs/application/contracts/plataforma-externa.client.js';

export class FakePlataformaExternaClient implements PlataformaExternaClient {
  readonly chamadas: CriarLoteNaPlataformaInput[] = [];
  readonly registros: RegistrarNaPlataformaInput[] = [];
  private falhaNoRegistro?: Error;
  private falhaNoBurst?: Error;
  private respostaDoRegistro: CredenciaisDaPlataforma = {
    cid: 'cid_fake',
    token: 'token_fake',
  };

  constructor(
    private readonly resposta: Omit<LoteCriadoNaPlataforma, 'cid'> & {
      cid?: string;
    },
  ) {}

  definirRespostaDoRegistro(resposta: CredenciaisDaPlataforma): void {
    this.respostaDoRegistro = resposta;
  }

  falharRegistroCom(erro: Error): void {
    this.falhaNoRegistro = erro;
  }

  falharBurstCom(erro: Error): void {
    this.falhaNoBurst = erro;
  }

  async registrar(
    input: RegistrarNaPlataformaInput,
  ): Promise<CredenciaisDaPlataforma> {
    this.registros.push(input);
    if (this.falhaNoRegistro) throw this.falhaNoRegistro;
    return this.respostaDoRegistro;
  }

  async criarLote(
    input: CriarLoteNaPlataformaInput,
  ): Promise<LoteCriadoNaPlataforma> {
    this.chamadas.push(input);
    if (this.falhaNoBurst) throw this.falhaNoBurst;
    return { ...this.resposta, cid: this.resposta.cid ?? input.cid };
  }
}

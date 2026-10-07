import {
  CredenciaisDaPlataforma,
  CriarLoteNaPlataformaInput,
  LoteCriadoNaPlataforma,
  PlataformaExternaClient,
  PlataformaExternaClientError,
  RegistrarNaPlataformaInput,
} from '../../application/contracts/plataforma-externa.client.js';

export interface HttpPlataformaExternaClientConfig {
  registerUrl: string;
  baseUrl: string;
}

export class HttpPlataformaExternaClient implements PlataformaExternaClient {
  constructor(private readonly config: HttpPlataformaExternaClientConfig) {}

  async registrar(
    input: RegistrarNaPlataformaInput,
  ): Promise<CredenciaisDaPlataforma> {
    const resposta = await this.enviar(this.config.registerUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!this.objeto(resposta)) {
      throw new PlataformaExternaClientError(
        'Resposta inválida recebida no registro da plataforma',
        'RESPOSTA_INVALIDA',
      );
    }

    const cid = resposta.cid;
    const token = resposta.token;
    if (!this.textoNaoVazio(cid) || !this.textoNaoVazio(token)) {
      throw new PlataformaExternaClientError(
        'Resposta inválida recebida no registro da plataforma',
        'RESPOSTA_INVALIDA',
      );
    }

    return { cid, token };
  }

  async criarLote(
    input: CriarLoteNaPlataformaInput,
  ): Promise<LoteCriadoNaPlataforma> {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const url = `${baseUrl}/burst/${encodeURIComponent(input.cid)}`;
    const resposta = await this.enviar(url, {
      method: 'POST',
      headers: { 'x-token': input.token },
    });

    if (!this.objeto(resposta)) {
      throw new PlataformaExternaClientError(
        'Resposta inválida recebida na criação do lote',
        'RESPOSTA_INVALIDA',
      );
    }

    const runId = resposta.run_id;
    const cid = resposta.cid;
    const total = resposta.total;
    const startedAt = resposta.started_at;
    const data =
      typeof startedAt === 'string' ? new Date(startedAt) : new Date(NaN);

    if (
      !this.textoNaoVazio(runId) ||
      !this.textoNaoVazio(cid) ||
      typeof total !== 'number' ||
      !Number.isInteger(total) ||
      total < 1 ||
      typeof startedAt !== 'string' ||
      !Number.isFinite(data.getTime()) ||
      data.toISOString() !== startedAt
    ) {
      throw new PlataformaExternaClientError(
        'Resposta inválida recebida na criação do lote',
        'RESPOSTA_INVALIDA',
      );
    }

    return { runId, cid, total, startedAt: data };
  }

  private async enviar(url: string, init: RequestInit): Promise<unknown> {
    let resposta: Response;
    try {
      resposta = await fetch(url, init);
    } catch {
      throw new PlataformaExternaClientError(
        'Não foi possível se comunicar com a plataforma externa',
        'PLATAFORMA',
      );
    }

    if (resposta.status !== 200) {
      const tipo =
        resposta.status === 400 || resposta.status === 422
          ? 'VALIDACAO'
          : 'PLATAFORMA';
      throw new PlataformaExternaClientError(
        `A plataforma externa respondeu com HTTP ${resposta.status}`,
        tipo,
        resposta.status,
      );
    }

    try {
      return await resposta.json();
    } catch {
      throw new PlataformaExternaClientError(
        'Resposta inválida recebida da plataforma externa',
        'RESPOSTA_INVALIDA',
        resposta.status,
      );
    }
  }

  private objeto(valor: unknown): valor is Record<string, unknown> {
    return typeof valor === 'object' && valor !== null;
  }

  private textoNaoVazio(valor: unknown): valor is string {
    return typeof valor === 'string' && valor.trim().length > 0;
  }
}

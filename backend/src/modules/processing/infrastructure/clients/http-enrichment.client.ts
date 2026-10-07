import {
  EnrichmentClient,
  EnrichmentInput,
  EnrichmentResult,
} from '../../application/contracts/enrichment.client.js';
import {
  EnrichmentNotFoundError,
  EnrichmentRateLimitError,
  EnrichmentTransientError,
  EnrichmentUnauthorizedError,
} from '../../domain/errors/enrichment.errors.js';
import { CredenciaisLoteStore } from '../../../runs/application/contracts/credenciais-lote.store.js';

const RETRY_AFTER_PADRAO_EM_SEGUNDOS = 1;

export interface HttpEnrichmentClientConfig {
  baseUrl: string;
  cid?: string;
  token?: string;
  credenciaisPorRun?: Pick<CredenciaisLoteStore, 'obter'>;
}

export class HttpEnrichmentClient implements EnrichmentClient {
  constructor(private readonly config: HttpEnrichmentClientConfig) {}

  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const credenciais = input.runId
      ? this.config.credenciaisPorRun?.obter(input.runId)
      : undefined;
    const cid = credenciais?.cid ?? this.config.cid;
    const token = credenciais?.token ?? this.config.token;
    if (!cid || !token) {
      throw new EnrichmentUnauthorizedError(
        'Credenciais de plataforma não disponíveis para esta run',
      );
    }
    const response = await fetch(
      `${baseUrl}/enrich/${encodeURIComponent(input.sku)}`,
      {
        method: 'GET',
        headers: {
          'x-cid': cid,
          'x-token': token,
        },
      },
    );

    if (!response.ok) {
      this.lancarErroDaResposta(response);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new EnrichmentTransientError(
        'Resposta inválida recebida no enriquecimento',
      );
    }

    if (!this.respostaValida(payload)) {
      throw new EnrichmentTransientError(
        'Resposta inválida recebida no enriquecimento',
      );
    }

    return payload;
  }

  private respostaValida(payload: unknown): payload is EnrichmentResult {
    if (typeof payload !== 'object' || payload === null) return false;

    const resposta = payload as Record<string, unknown>;
    return (
      typeof resposta.sku === 'string' &&
      resposta.sku.trim().length > 0 &&
      typeof resposta.price === 'number' &&
      Number.isFinite(resposta.price) &&
      typeof resposta.stock === 'number' &&
      Number.isInteger(resposta.stock)
    );
  }

  private lancarErroDaResposta(response: Response): never {
    if (response.status === 429) {
      const retryAfter = Number.parseFloat(
        response.headers.get('retry-after') ?? '',
      );
      throw new EnrichmentRateLimitError(
        Number.isFinite(retryAfter) && retryAfter >= 0
          ? retryAfter
          : RETRY_AFTER_PADRAO_EM_SEGUNDOS,
      );
    }

    if (response.status === 401) {
      throw new EnrichmentUnauthorizedError();
    }

    if (response.status === 404) {
      throw new EnrichmentNotFoundError();
    }

    throw new EnrichmentTransientError(
      `Falha HTTP ${response.status} no enriquecimento`,
    );
  }
}

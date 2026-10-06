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

const RETRY_AFTER_PADRAO_EM_SEGUNDOS = 1;

export interface HttpEnrichmentClientConfig {
  baseUrl: string;
  cid: string;
  token: string;
}

export class HttpEnrichmentClient implements EnrichmentClient {
  constructor(private readonly config: HttpEnrichmentClientConfig) {}

  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const response = await fetch(
      `${baseUrl}/enrich/${encodeURIComponent(input.sku)}`,
      {
        method: 'GET',
        headers: {
          'x-cid': this.config.cid,
          'x-token': this.config.token,
        },
      },
    );

    if (!response.ok) {
      this.lancarErroDaResposta(response);
    }

    return (await response.json()) as EnrichmentResult;
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

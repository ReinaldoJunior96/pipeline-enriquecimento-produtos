import {
  EnrichmentClient,
  EnrichmentInput,
  EnrichmentResult,
} from '../../application/contracts/enrichment.client.js';

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
      throw new Error(`Enriquecimento respondeu HTTP ${response.status}`);
    }

    return (await response.json()) as EnrichmentResult;
  }
}

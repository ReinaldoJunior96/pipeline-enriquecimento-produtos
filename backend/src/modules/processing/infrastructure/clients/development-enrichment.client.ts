import { Injectable } from '@nestjs/common';
import {
  EnrichmentClient,
  EnrichmentInput,
  EnrichmentResult,
} from '../../application/contracts/enrichment.client.js';

@Injectable()
export class DevelopmentEnrichmentClient implements EnrichmentClient {
  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    return { sku: input.sku, price: 99.9, stock: 12 };
  }
}

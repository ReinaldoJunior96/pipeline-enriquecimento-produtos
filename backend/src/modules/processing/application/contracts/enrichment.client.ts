export interface EnrichmentInput {
  sku: string;
}

export interface EnrichmentResult {
  sku: string;
  price: number;
  stock: number;
}

export interface EnrichmentClient {
  enrich(input: EnrichmentInput): Promise<EnrichmentResult>;
}

export const ENRICHMENT_CLIENT = Symbol('ENRICHMENT_CLIENT');

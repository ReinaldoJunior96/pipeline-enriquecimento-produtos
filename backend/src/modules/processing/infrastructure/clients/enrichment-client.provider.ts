import { EnrichmentClient } from '../../application/contracts/enrichment.client.js';
import { DevelopmentEnrichmentClient } from './development-enrichment.client.js';
import { HttpEnrichmentClient } from './http-enrichment.client.js';

type EnrichmentEnvironment = Record<string, string | undefined>;

function variavelObrigatoria(
  ambiente: EnrichmentEnvironment,
  nome: string,
): string {
  const valor = ambiente[nome]?.trim();
  if (!valor) {
    throw new Error(`A variável ${nome} não foi configurada`);
  }
  return valor;
}

export function criarEnrichmentClient(
  desenvolvimento: DevelopmentEnrichmentClient,
  ambiente: EnrichmentEnvironment = process.env,
): EnrichmentClient {
  const modo =
    ambiente.ENRICHMENT_MODE ??
    (ambiente.NODE_ENV === 'test' ? 'fake' : 'http');

  if (modo === 'fake') return desenvolvimento;
  if (modo !== 'http') {
    throw new Error(`ENRICHMENT_MODE inválido: ${modo}`);
  }

  return new HttpEnrichmentClient({
    baseUrl: variavelObrigatoria(ambiente, 'PLATAFORMA_BASE_URL'),
    cid: variavelObrigatoria(ambiente, 'PLATAFORMA_CID'),
    token: variavelObrigatoria(ambiente, 'PLATAFORMA_TOKEN'),
  });
}

import { EnrichmentClient } from '../../application/contracts/enrichment.client.js';
import { DevelopmentEnrichmentClient } from './development-enrichment.client.js';
import { HttpEnrichmentClient } from './http-enrichment.client.js';
import { PlatformAuthContextStore } from '../../../platform-auth/application/contracts/platform-auth-context.store.js';

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
  platformAuthContextStore: Pick<PlatformAuthContextStore, 'getForRun'>,
): EnrichmentClient {
  const modo =
    ambiente.ENRICHMENT_MODE ??
    (ambiente.NODE_ENV === 'test' ? 'fake' : 'http');

  if (modo === 'fake') return desenvolvimento;
  if (modo !== 'http') {
    throw new Error(`ENRICHMENT_MODE inválido: ${modo}`);
  }
  const baseUrl = variavelObrigatoria(ambiente, 'PLATAFORMA_BASE_URL');
  if (!platformAuthContextStore) {
    throw new Error('O contexto efêmero de autenticação não foi configurado');
  }
  return new HttpEnrichmentClient({
    baseUrl,
    platformAuthContextStore,
  });
}

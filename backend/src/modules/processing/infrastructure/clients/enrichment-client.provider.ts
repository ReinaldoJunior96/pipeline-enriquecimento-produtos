import { EnrichmentClient } from '../../application/contracts/enrichment.client.js';
import { DevelopmentEnrichmentClient } from './development-enrichment.client.js';
import { HttpEnrichmentClient } from './http-enrichment.client.js';
import { CredenciaisLoteStore } from '../../../runs/application/contracts/credenciais-lote.store.js';

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

function variavelOpcional(
  ambiente: EnrichmentEnvironment,
  nome: string,
): string | undefined {
  const valor = ambiente[nome]?.trim();
  return valor || undefined;
}

export function criarEnrichmentClient(
  desenvolvimento: DevelopmentEnrichmentClient,
  ambiente: EnrichmentEnvironment = process.env,
  credenciaisPorRun?: Pick<CredenciaisLoteStore, 'obter'>,
): EnrichmentClient {
  const modo =
    ambiente.ENRICHMENT_MODE ??
    (ambiente.NODE_ENV === 'test' ? 'fake' : 'http');

  if (modo === 'fake') return desenvolvimento;
  if (modo !== 'http') {
    throw new Error(`ENRICHMENT_MODE inválido: ${modo}`);
  }

  const cid = variavelOpcional(ambiente, 'PLATAFORMA_CID');
  const token = variavelOpcional(ambiente, 'PLATAFORMA_TOKEN');
  if (!credenciaisPorRun && (!cid || !token)) {
    variavelObrigatoria(ambiente, !cid ? 'PLATAFORMA_CID' : 'PLATAFORMA_TOKEN');
  }

  return new HttpEnrichmentClient({
    baseUrl: variavelObrigatoria(ambiente, 'PLATAFORMA_BASE_URL'),
    cid,
    token,
    credenciaisPorRun,
  });
}

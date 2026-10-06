import {
  EnrichmentClient,
  EnrichmentInput,
  EnrichmentResult,
} from '../../src/modules/processing/application/contracts/enrichment.client.js';

export class FakeEnrichmentClient implements EnrichmentClient {
  readonly chamadas: EnrichmentInput[] = [];
  private readonly respostas = new Map<string, EnrichmentResult>();
  private readonly erros = new Map<string, Error>();

  responderCom(sku: string, resposta: EnrichmentResult): void {
    this.respostas.set(sku, resposta);
  }

  falharCom(sku: string, erro: Error): void {
    this.erros.set(sku, erro);
  }

  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    this.chamadas.push(input);

    const erro = this.erros.get(input.sku);
    if (erro) throw erro;

    const resposta = this.respostas.get(input.sku);
    if (!resposta) {
      throw new Error(`Nenhuma resposta configurada para o SKU ${input.sku}`);
    }

    return resposta;
  }
}

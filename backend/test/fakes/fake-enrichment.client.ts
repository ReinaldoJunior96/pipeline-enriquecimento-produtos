import {
  EnrichmentClient,
  EnrichmentInput,
  EnrichmentResult,
} from '../../src/modules/processing/application/contracts/enrichment.client.js';

export class FakeEnrichmentClient implements EnrichmentClient {
  readonly chamadas: EnrichmentInput[] = [];
  readonly instantesDasChamadas: number[] = [];
  private readonly respostas = new Map<string, EnrichmentResult>();
  private readonly erros = new Map<string, Error>();
  private readonly sequencias = new Map<
    string,
    Array<EnrichmentResult | Error>
  >();

  responderCom(sku: string, resposta: EnrichmentResult): void {
    this.respostas.set(sku, resposta);
  }

  falharCom(sku: string, erro: Error): void {
    this.erros.set(sku, erro);
  }

  responderEmSequencia(
    sku: string,
    sequencia: Array<EnrichmentResult | Error>,
  ): void {
    this.sequencias.set(sku, [...sequencia]);
  }

  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    this.chamadas.push(input);
    this.instantesDasChamadas.push(Date.now());

    const sequencia = this.sequencias.get(input.sku);
    const proximo = sequencia?.shift();
    if (proximo instanceof Error) throw proximo;
    if (proximo) return proximo;

    const erro = this.erros.get(input.sku);
    if (erro) throw erro;

    const resposta = this.respostas.get(input.sku);
    if (!resposta) {
      throw new Error(`Nenhuma resposta configurada para o SKU ${input.sku}`);
    }

    return resposta;
  }
}

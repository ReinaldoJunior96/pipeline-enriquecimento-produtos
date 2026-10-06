import { DevelopmentEnrichmentClient } from './development-enrichment.client.js';
import { criarEnrichmentClient } from './enrichment-client.provider.js';
import { HttpEnrichmentClient } from './http-enrichment.client.js';

describe('Provider do cliente de enriquecimento', () => {
  const desenvolvimento = new DevelopmentEnrichmentClient();

  it('deve usar o cliente fake quando o modo for fake', () => {
    expect(
      criarEnrichmentClient(desenvolvimento, {
        ENRICHMENT_MODE: 'fake',
      }),
    ).toBe(desenvolvimento);
  });

  it('deve criar o cliente HTTP com as variáveis da plataforma', () => {
    expect(
      criarEnrichmentClient(desenvolvimento, {
        ENRICHMENT_MODE: 'http',
        PLATAFORMA_BASE_URL: 'https://plataforma.test',
        PLATAFORMA_CID: 'cid-test',
        PLATAFORMA_TOKEN: 'token-test',
      }),
    ).toBeInstanceOf(HttpEnrichmentClient);
  });

  it('deve rejeitar configuração HTTP incompleta sem revelar credenciais', () => {
    expect(() =>
      criarEnrichmentClient(desenvolvimento, {
        ENRICHMENT_MODE: 'http',
        PLATAFORMA_BASE_URL: 'https://plataforma.test',
        PLATAFORMA_CID: 'cid-test',
      }),
    ).toThrow('A variável PLATAFORMA_TOKEN não foi configurada');
  });
});

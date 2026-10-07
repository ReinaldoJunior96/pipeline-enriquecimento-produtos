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

  it('deve criar o cliente HTTP com URL e store de autenticação por run', () => {
    expect(
      criarEnrichmentClient(
        desenvolvimento,
        {
          ENRICHMENT_MODE: 'http',
          PLATAFORMA_BASE_URL: 'https://plataforma.test',
        },
        { getForRun: vi.fn() },
      ),
    ).toBeInstanceOf(HttpEnrichmentClient);
  });

  it('deve aceitar o store efêmero como dependência do cliente HTTP', () => {
    expect(
      criarEnrichmentClient(
        desenvolvimento,
        {
          ENRICHMENT_MODE: 'http',
          PLATAFORMA_BASE_URL: 'https://plataforma.test',
        },
        { getForRun: vi.fn() },
      ),
    ).toBeInstanceOf(HttpEnrichmentClient);
  });

  it('deve rejeitar configuração HTTP sem URL da plataforma', () => {
    expect(() =>
      criarEnrichmentClient(desenvolvimento, {
        ENRICHMENT_MODE: 'http',
        PLATAFORMA_BASE_URL: '',
      }),
    ).toThrow('A variável PLATAFORMA_BASE_URL não foi configurada');
  });
});

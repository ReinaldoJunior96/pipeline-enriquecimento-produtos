import {
  EnrichmentNotFoundError,
  EnrichmentRateLimitError,
  EnrichmentTransientError,
  EnrichmentUnauthorizedError,
} from '../../domain/errors/enrichment.errors.js';
import { HttpEnrichmentClient } from './http-enrichment.client.js';

describe('HttpEnrichmentClient', () => {
  const config = {
    baseUrl: 'https://plataforma.test',
    cid: 'cid-test',
    token: 'token-test',
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve buscar o SKU com as credenciais e retornar o enriquecimento', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ sku: 'sku-001', price: 99.9, stock: 12 }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    const cliente = new HttpEnrichmentClient(config);

    await expect(cliente.enrich({ sku: 'sku-001' })).resolves.toEqual({
      sku: 'sku-001',
      price: 99.9,
      stock: 12,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://plataforma.test/enrich/sku-001',
      {
        method: 'GET',
        headers: {
          'x-cid': 'cid-test',
          'x-token': 'token-test',
        },
      },
    );
  });

  it('deve mapear HTTP 429 preservando o Retry-After', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 429,
        headers: { 'retry-after': '0.25' },
      }),
    );

    await expect(
      new HttpEnrichmentClient(config).enrich({ sku: 'sku-429' }),
    ).rejects.toEqual(new EnrichmentRateLimitError(0.25));
  });

  it('deve mapear HTTP 500 como erro transitório', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 500 }),
    );

    await expect(
      new HttpEnrichmentClient(config).enrich({ sku: 'sku-500' }),
    ).rejects.toBeInstanceOf(EnrichmentTransientError);
  });

  it('deve mapear HTTP 401 como erro definitivo de credencial', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 401 }),
    );

    await expect(
      new HttpEnrichmentClient(config).enrich({ sku: 'sku-401' }),
    ).rejects.toBeInstanceOf(EnrichmentUnauthorizedError);
  });

  it('deve mapear HTTP 404 como erro definitivo de SKU', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 404 }),
    );

    await expect(
      new HttpEnrichmentClient(config).enrich({ sku: 'sku-404' }),
    ).rejects.toBeInstanceOf(EnrichmentNotFoundError);
  });
});

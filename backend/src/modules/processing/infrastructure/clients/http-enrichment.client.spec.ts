import { HttpEnrichmentClient } from './http-enrichment.client.js';

describe('HttpEnrichmentClient', () => {
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
    const cliente = new HttpEnrichmentClient({
      baseUrl: 'https://plataforma.test',
      cid: 'cid-test',
      token: 'token-test',
    });

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
});

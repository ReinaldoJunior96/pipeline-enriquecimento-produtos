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
    platformAuthContextStore: {
      getForRun: vi.fn(async () => ({ cid: 'cid-test', token: 'token-test' })),
    },
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve buscar o SKU com as credenciais e retornar o enriquecimento', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ sku: 'sku-001', price: 99.9, stock: 12 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const cliente = new HttpEnrichmentClient(config);

    await expect(
      cliente.enrich({ sku: 'sku-001', runId: 'run-001' }),
    ).resolves.toEqual({
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

  it('deve usar as credenciais em memória associadas à run', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ sku: 'sku-dinamico', price: 19.9, stock: 2 }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    const cliente = new HttpEnrichmentClient({
      ...config,
      platformAuthContextStore: {
        getForRun: async (runId: string) =>
          runId === 'run-dinamica'
            ? { cid: 'cid-dinamico', token: 'token-dinamico' }
            : null,
      },
    });

    await cliente.enrich({
      sku: 'sku-dinamico',
      runId: 'run-dinamica',
    } as never);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://plataforma.test/enrich/sku-dinamico',
      {
        method: 'GET',
        headers: {
          'x-cid': 'cid-dinamico',
          'x-token': 'token-dinamico',
        },
      },
    );
  });

  it('deve falhar de forma transitória sem fazer request quando não há auth para a run', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const cliente = new HttpEnrichmentClient({
      ...config,
      platformAuthContextStore: { getForRun: vi.fn(async () => null) },
    });

    await expect(
      cliente.enrich({ sku: 'sku-sem-auth', runId: 'run-sem-auth' }),
    ).rejects.toMatchObject({
      code: 'TRANSIENT_ERROR',
      transient: true,
      message: expect.stringContaining('run-sem-auth'),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('deve mapear HTTP 429 preservando o Retry-After', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 429,
        headers: { 'retry-after': '0.25' },
      }),
    );

    await expect(
      new HttpEnrichmentClient(config).enrich({
        sku: 'sku-429',
        runId: 'run-429',
      }),
    ).rejects.toEqual(new EnrichmentRateLimitError(0.25));
  });

  it('deve mapear HTTP 500 como erro transitório', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 500 }),
    );

    await expect(
      new HttpEnrichmentClient(config).enrich({
        sku: 'sku-500',
        runId: 'run-500',
      }),
    ).rejects.toBeInstanceOf(EnrichmentTransientError);
  });

  it.each([
    new TypeError('fetch failed: token secreto'),
    Object.assign(new Error('aborted'), { name: 'AbortError' }),
  ])('deve converter falha de transporte em erro transitório sem expor detalhes', async (erro) => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(erro);

    await expect(
      new HttpEnrichmentClient(config).enrich({
        sku: 'sku-network',
        runId: 'run-network',
      }),
    ).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      transient: true,
      message: expect.not.stringContaining('token secreto'),
    });
  });

  it('deve mapear HTTP 401 como erro definitivo de credencial', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 401 }),
    );

    await expect(
      new HttpEnrichmentClient(config).enrich({
        sku: 'sku-401',
        runId: 'run-401',
      }),
    ).rejects.toBeInstanceOf(EnrichmentUnauthorizedError);
  });

  it('deve mapear HTTP 404 como erro definitivo de SKU', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 404 }),
    );

    await expect(
      new HttpEnrichmentClient(config).enrich({
        sku: 'sku-404',
        runId: 'run-404',
      }),
    ).rejects.toBeInstanceOf(EnrichmentNotFoundError);
  });

  it.each([
    { sku: 123, price: 99.9, stock: 12 },
    { sku: 'sku-invalid', price: '99.90', stock: 12 },
    { sku: 'sku-invalid', price: 99.9, stock: 1.5 },
  ])('deve rejeitar uma resposta 200 fora do contrato: %j', async (payload) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(
      new HttpEnrichmentClient(config).enrich({
        sku: 'sku-invalid',
        runId: 'run-invalid',
      }),
    ).rejects.toBeInstanceOf(EnrichmentTransientError);
  });
});

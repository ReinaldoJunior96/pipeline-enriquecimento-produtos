import {
  EnrichmentNotFoundError,
  EnrichmentRateLimitError,
  EnrichmentTransientError,
  EnrichmentUnauthorizedError,
} from './enrichment.errors.js';

describe('Erros de enriquecimento', () => {
  it('deve classificar rate limit como transitório e preservar Retry-After', () => {
    const erro = new EnrichmentRateLimitError(2);

    expect(erro).toMatchObject({
      code: 'RATE_LIMITED',
      transient: true,
      retryAfterSeconds: 2,
    });
  });

  it('deve classificar erro 500 como transitório', () => {
    expect(new EnrichmentTransientError()).toMatchObject({
      code: 'TRANSIENT_ERROR',
      transient: true,
    });
  });

  it('deve classificar erro 401 como definitivo', () => {
    expect(new EnrichmentUnauthorizedError()).toMatchObject({
      code: 'UNAUTHORIZED',
      transient: false,
    });
  });

  it('deve classificar erro 404 como definitivo', () => {
    expect(new EnrichmentNotFoundError()).toMatchObject({
      code: 'SKU_NOT_FOUND',
      transient: false,
    });
  });
});

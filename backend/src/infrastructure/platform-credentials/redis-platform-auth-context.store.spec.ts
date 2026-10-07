import {
  RedisPlatformAuthContextStore,
  obterPlatformAuthTtlSeconds,
  PLATFORM_AUTH_TTL_SECONDS_PADRAO,
} from './redis-platform-auth-context.store.js';

describe('RedisPlatformAuthContextStore', () => {
  it('usa 300 segundos como TTL padrão', () => {
    vi.stubEnv('PLATFORM_AUTH_TTL_SECONDS', '');
    try {
      expect(PLATFORM_AUTH_TTL_SECONDS_PADRAO).toBe(300);
      expect(obterPlatformAuthTtlSeconds()).toBe(300);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('permite sobrescrever o TTL padrão por variável de ambiente', () => {
    vi.stubEnv('PLATFORM_AUTH_TTL_SECONDS', '900');
    try {
      expect(obterPlatformAuthTtlSeconds()).toBe(900);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('salva a credencial no Redis com o TTL configurado', async () => {
    const redis = { set: vi.fn().mockResolvedValue('OK') };
    const store = new RedisPlatformAuthContextStore(
      Promise.resolve(redis as never),
      300,
    );

    await store.saveForRun({ runId: 'run-1', cid: 'cid-1', token: 'token-1' });

    expect(redis.set).toHaveBeenCalledWith(
      'platform:auth:run:run-1',
      JSON.stringify({ cid: 'cid-1', token: 'token-1' }),
      { EX: 300 },
    );
  });

  it('rejeita TTL não positivo ou fracionário', () => {
    expect(() => obterPlatformAuthTtlSeconds('0')).toThrow(
      'PLATFORM_AUTH_TTL_SECONDS deve ser um inteiro maior que zero',
    );
    expect(() => obterPlatformAuthTtlSeconds('1.5')).toThrow(
      'PLATFORM_AUTH_TTL_SECONDS deve ser um inteiro maior que zero',
    );
  });
});

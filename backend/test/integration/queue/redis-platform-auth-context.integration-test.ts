import { Logger } from '@nestjs/common';
import { RedisConnection } from 'bullmq';
import { RedisPlatformAuthContextStore } from '../../../src/infrastructure/platform-credentials/redis-platform-auth-context.store.js';

describe('RedisPlatformAuthContextStore', () => {
  const ttlSeconds = 1800;
  let connection: RedisConnection;
  let redis: Awaited<RedisConnection['client']>;
  let store: RedisPlatformAuthContextStore;
  let runId: string;

  beforeAll(async () => {
    connection = new RedisConnection({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
    });
    redis = await connection.client;
    store = new RedisPlatformAuthContextStore(connection.client, ttlSeconds);
  });

  beforeEach(async () => {
    runId = `redis-auth-${crypto.randomUUID()}`;
    await redis.del(`platform:auth:run:${runId}`);
  });

  afterEach(async () => {
    await redis.del(`platform:auth:run:${runId}`);
  });

  afterAll(async () => {
    await connection.close();
  });

  it('deve salvar e recuperar credenciais por run com TTL', async () => {
    const contexto = { cid: 'cid_redis_fake', token: 'token_redis_fake' };

    await store.saveForRun({ runId, ...contexto });

    await expect(store.getForRun(runId)).resolves.toEqual(contexto);
    await expect(
      redis.ttl(`platform:auth:run:${runId}`),
    ).resolves.toBeGreaterThan(0);
    await expect(
      redis.ttl(`platform:auth:run:${runId}`),
    ).resolves.toBeLessThanOrEqual(ttlSeconds);
  });

  it('deve retornar null para uma run sem autenticação', async () => {
    await expect(store.getForRun(runId)).resolves.toBeNull();
  });

  it('deve remover a autenticação da run', async () => {
    await store.saveForRun({ runId, cid: 'cid_fake', token: 'token_fake' });

    await store.deleteForRun(runId);

    await expect(store.getForRun(runId)).resolves.toBeNull();
  });

  it('deve rejeitar payload inválido sem expor seu conteúdo', async () => {
    const segredo = 'nao-expor-este-conteudo';
    await redis.set(`platform:auth:run:${runId}`, segredo, 'EX', 30);

    let mensagem = '';
    try {
      await store.getForRun(runId);
    } catch (erro) {
      mensagem = (erro as Error).message;
      expect((erro as Error).name).toBe('PlatformAuthContextInvalidError');
    }

    expect(mensagem).not.toContain(segredo);
  });

  it('não deve registrar o token nos logs', async () => {
    const token = 'token_que_nao_pode_aparecer_em_log';
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    try {
      await store.saveForRun({ runId, cid: 'cid_fake', token });
      await store.getForRun(runId);

      expect(log.mock.calls.flat().join(' ')).not.toContain(token);
    } finally {
      log.mockRestore();
    }
  });

  it('deve rejeitar TTL que não seja inteiro positivo', () => {
    expect(
      () => new RedisPlatformAuthContextStore(connection.client, 0),
    ).toThrow('PLATFORM_AUTH_TTL_SECONDS deve ser um inteiro maior que zero');
    expect(
      () => new RedisPlatformAuthContextStore(connection.client, 1.5),
    ).toThrow('PLATFORM_AUTH_TTL_SECONDS deve ser um inteiro maior que zero');
  });
});

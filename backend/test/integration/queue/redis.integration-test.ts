import { RedisConnection } from 'bullmq';

describe('Conexão com Redis', () => {
  it('deve conectar, responder ao ping e encerrar a conexão', async () => {
    const conexao = new RedisConnection({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
    });

    try {
      const cliente = await conexao.client;

      await expect(cliente.ping()).resolves.toBe('PONG');
    } finally {
      await conexao.close();
    }

    expect(conexao.status).toBe('closed');
  });
});

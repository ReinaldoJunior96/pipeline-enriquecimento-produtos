import { performance } from 'node:perf_hooks';
import request from 'supertest';
import { criarAplicacaoProcessamentoDeTeste } from '../support/criar-aplicacao-processamento-de-teste.js';

describe('Benchmark local de ACK do /process', () => {
  it('mede 100 ACKs sem banco, Redis ou plataforma externa', async () => {
    const { app } = await criarAplicacaoProcessamentoDeTeste();
    app.useLogger(false);
    const amostras: number[] = [];

    try {
      for (let seq = 0; seq < 100; seq += 1) {
        const inicio = performance.now();
        await request(app.getHttpServer())
          .post('/process')
          .send({ run_id: 'run-benchmark-ack-local', seq, sku: `sku-${seq}` })
          .expect(202)
          .expect({ status: 'accepted' });
        amostras.push(performance.now() - inicio);
      }
    } finally {
      await app.close();
    }

    const ordenadas = [...amostras].sort((a, b) => a - b);
    const soma = amostras.reduce((total, duracao) => total + duracao, 0);
    const min = ordenadas[0]!;
    const avg = soma / amostras.length;
    const p95 = ordenadas[Math.ceil(amostras.length * 0.95) - 1]!;
    const max = ordenadas.at(-1)!;

    process.stdout.write(
      [
        'Benchmark local do ACK /process (100 amostras)',
        `min: ${min.toFixed(2)} ms`,
        `avg: ${avg.toFixed(2)} ms`,
        `p95: ${p95.toFixed(2)} ms`,
        `max: ${max.toFixed(2)} ms`,
      ].join('\n') + '\n',
    );
    expect(max).toBeLessThan(600);
  }, 30_000);
});

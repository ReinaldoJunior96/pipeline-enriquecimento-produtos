import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { criarAplicacaoProcessamentoDeTeste } from '../../support/criar-aplicacao-processamento-de-teste.js';

describe('Recuperação do enqueue de /process', () => {
  let app: INestApplication<App>;
  let repositorio: Awaited<
    ReturnType<typeof criarAplicacaoProcessamentoDeTeste>
  >['repositorio'];
  let fila: Awaited<
    ReturnType<typeof criarAplicacaoProcessamentoDeTeste>
  >['fila'];

  beforeAll(async () => {
    const aplicacao = await criarAplicacaoProcessamentoDeTeste();
    app = aplicacao.app;
    repositorio = aplicacao.repositorio;
    fila = aplicacao.fila;
    app.useLogger(false);
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve aceitar a repetição e enfileirar item PENDING após falha do primeiro enqueue', async () => {
    const item = { run_id: 'run_abc123', seq: 9, sku: 'sku-retry-enqueue' };
    vi.spyOn(fila, 'enqueue').mockRejectedValueOnce(
      new Error('Redis indisponível'),
    );

    await request(app.getHttpServer()).post('/process').send(item).expect(500);
    await expect(
      repositorio.findByRunIdAndSeq(item.run_id, item.seq),
    ).resolves.toMatchObject({ status: 'PENDING' });

    await request(app.getHttpServer())
      .post('/process')
      .send(item)
      .expect(202)
      .expect({ status: 'accepted' });

    expect(fila.itens).toEqual([
      { runId: item.run_id, seq: item.seq, sku: item.sku },
    ]);
  });
});

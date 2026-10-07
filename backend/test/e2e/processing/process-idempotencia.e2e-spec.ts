import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { FakeProcessItemRepository } from '../../fakes/fake-process-item.repository.js';
import { FakeProcessingQueue } from '../../fakes/fake-processing.queue.js';
import { criarAplicacaoProcessamentoDeTeste } from '../../support/criar-aplicacao-processamento-de-teste.js';

describe('Idempotência do processamento (e2e)', () => {
  let app: INestApplication<App>;
  let repositorio: FakeProcessItemRepository;
  let fila: FakeProcessingQueue;

  beforeAll(async () => {
    ({ app, repositorio, fila } = await criarAplicacaoProcessamentoDeTeste());
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve aceitar requisições repetidas sem duplicar o item e garantir o enqueue PENDING', async () => {
    const item = {
      run_id: 'run_abc123',
      seq: 0,
      sku: 'sku-001',
    };

    await request(app.getHttpServer())
      .post('/process')
      .send(item)
      .expect(202)
      .expect({ status: 'accepted' });

    await request(app.getHttpServer())
      .post('/process')
      .send(item)
      .expect(202)
      .expect({ status: 'accepted' });

    expect(repositorio.itens).toHaveLength(1);
    expect(fila.itens).toHaveLength(2);
  });
});

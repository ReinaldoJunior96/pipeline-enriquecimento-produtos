import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { FakeProcessItemRepository } from '../../fakes/fake-process-item.repository.js';
import { FakeProcessingQueue } from '../../fakes/fake-processing.queue.js';
import { criarAplicacaoProcessamentoDeTeste } from '../../support/criar-aplicacao-processamento-de-teste.js';

interface FilaDeEsperaObservavel {
  itens: Array<{ runId: string; seq: number; sku: string }>;
}

describe('Recebimento de item antes da criação do lote (e2e)', () => {
  let app: INestApplication<App>;
  let repositorio: FakeProcessItemRepository;
  let fila: FakeProcessingQueue;
  let filaDeEspera: FilaDeEsperaObservavel;

  beforeAll(async () => {
    const aplicacao = await criarAplicacaoProcessamentoDeTeste({
      runsExistentes: [],
    });

    ({ app, repositorio, fila, filaDeEspera } = aplicacao);
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve aceitar e aguardar o lote sem persistir ou processar o item', async () => {
    const item = {
      run_id: 'run-ainda-nao-criada',
      seq: 1,
      sku: 'sku-001',
    };

    await request(app.getHttpServer())
      .post('/process')
      .send(item)
      .expect(202)
      .expect({ status: 'accepted' });

    expect(repositorio.itens).toHaveLength(0);
    expect(fila.itens).toHaveLength(0);
    expect(filaDeEspera.itens).toEqual([
      { runId: item.run_id, seq: item.seq, sku: item.sku },
    ]);
  });
});

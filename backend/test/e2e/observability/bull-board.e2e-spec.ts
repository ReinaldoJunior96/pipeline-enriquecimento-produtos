import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import {
  BULL_BOARD_ROUTE,
  BullBoardObservabilityModule,
} from '../../../src/infrastructure/observability/bull-board.module.js';
import { BullmqInfrastructureModule } from '../../../src/infrastructure/queue/bullmq-infrastructure.module.js';

async function criarAplicacaoBullBoard(
  ativado: boolean,
): Promise<INestApplication<App>> {
  const modulo = await Test.createTestingModule({
    imports: [
      BullmqInfrastructureModule,
      BullBoardObservabilityModule.register(ativado),
    ],
  }).compile();
  const app = modulo.createNestApplication();
  await app.init();
  return app;
}

describe('Bull Board (e2e)', () => {
  it('não deve expor o painel quando estiver desabilitado', async () => {
    const app = await criarAplicacaoBullBoard(false);

    try {
      await request(app.getHttpServer()).get(BULL_BOARD_ROUTE).expect(404);
    } finally {
      await app.close();
    }
  });

  it('deve expor em modo somente leitura a fila processing', async () => {
    const app = await criarAplicacaoBullBoard(true);

    try {
      const pagina = await request(app.getHttpServer())
        .get(BULL_BOARD_ROUTE)
        .expect(200);
      expect(pagina.text).toContain('Filas do pipeline de enriquecimento');

      const resposta = await request(app.getHttpServer())
        .get(`${BULL_BOARD_ROUTE}/api/queues`)
        .expect(200);
      expect(resposta.body.queues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'processing',
            readOnlyMode: true,
          }),
        ]),
      );
    } finally {
      await app.close();
    }
  });
});

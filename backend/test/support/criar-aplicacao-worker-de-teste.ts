import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/infrastructure/database/prisma.service.js';
import { ENRICHMENT_CLIENT } from '../../src/modules/processing/application/contracts/enrichment.client.js';
import { ProcessItemInput } from '../../src/modules/processing/domain/repositories/process-item.repository.js';
import { PROCESSING_QUEUE_NAME } from '../../src/modules/processing/infrastructure/queues/processing-queue.constants.js';
import { FakeEnrichmentClient } from '../fakes/fake-enrichment.client.js';

interface AplicacaoWorkerDeTeste {
  app: INestApplication<App>;
  prisma: PrismaService;
  fila: Queue<ProcessItemInput>;
}

export async function criarAplicacaoWorkerDeTeste(
  cliente: FakeEnrichmentClient,
): Promise<AplicacaoWorkerDeTeste> {
  const modulo = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ENRICHMENT_CLIENT)
    .useValue(cliente)
    .compile();
  const fila = modulo.get<Queue<ProcessItemInput>>(
    getQueueToken(PROCESSING_QUEUE_NAME),
  );
  await fila.obliterate({ force: true });
  const app = modulo.createNestApplication();
  await app.init();

  return { app, prisma: app.get(PrismaService), fila };
}

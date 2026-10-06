import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { AppModule } from '../../../../app.module.js';
import { PROCESSING_QUEUE } from '../../application/queues/processing.queue.js';
import { BullMqProcessingQueue } from './bullmq-processing.queue.js';
import { PROCESSING_QUEUE_NAME } from './processing-queue.constants.js';

describe('Registro da fila de processamento', () => {
  let modulo: TestingModule;

  afterEach(async () => {
    await modulo?.close();
  });

  it('deve disponibilizar a fila processing pelo container do NestJS', async () => {
    modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();

    const fila = modulo.get<Queue>(getQueueToken(PROCESSING_QUEUE_NAME));

    expect(fila.name).toBe('processing');
  });

  it('deve usar o adapter BullMQ no contrato da fila de processamento', async () => {
    modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();

    const fila = modulo.get(PROCESSING_QUEUE);

    expect(fila).toBeInstanceOf(BullMqProcessingQueue);
  });
});

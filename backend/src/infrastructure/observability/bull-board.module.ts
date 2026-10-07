import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { DynamicModule, Module } from '@nestjs/common';
import { ProcessingModule } from '../../modules/processing/processing.module.js';
import { PENDING_RUN_QUEUE_NAME } from '../../modules/processing/infrastructure/queues/pending-run-queue.constants.js';
import { PROCESSING_QUEUE_NAME } from '../../modules/processing/infrastructure/queues/processing-queue.constants.js';

export const BULL_BOARD_ROUTE = '/admin/queues';

export function bullBoardEstaAtivado(
  valor = process.env.BULL_BOARD_ENABLED,
): boolean {
  return valor === 'true';
}

@Module({})
export class BullBoardObservabilityModule {
  static register(ativado = bullBoardEstaAtivado()): DynamicModule {
    return {
      module: BullBoardObservabilityModule,
      imports: ativado
        ? [
            ProcessingModule,
            BullBoardModule.forRoot({
              route: BULL_BOARD_ROUTE,
              adapter: ExpressAdapter,
              boardOptions: {
                uiConfig: {
                  boardTitle: 'Filas do pipeline de enriquecimento',
                  hideRedisDetails: true,
                },
              },
            }),
            BullBoardModule.forFeature({
              name: PROCESSING_QUEUE_NAME,
              adapter: BullMQAdapter,
              options: {
                readOnlyMode: true,
                description: 'Processamento assíncrono dos produtos',
              },
            }),
            BullBoardModule.forFeature({
              name: PENDING_RUN_QUEUE_NAME,
              adapter: BullMQAdapter,
              options: {
                readOnlyMode: true,
                description: 'Itens aguardando a persistência do lote',
              },
            }),
          ]
        : [],
    };
  }
}

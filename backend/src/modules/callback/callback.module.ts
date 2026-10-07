import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module.js';
import { PlatformCredentialsModule } from '../../infrastructure/platform-credentials/platform-credentials.module.js';
import {
  PLATFORM_AUTH_CONTEXT_STORE,
  PlatformAuthContextStore,
} from '../platform-auth/application/contracts/platform-auth-context.store.js';
import { ProcessItemRepository } from '../processing/domain/repositories/process-item.repository.js';
import { PrismaProcessItemRepository } from '../processing/infrastructure/repositories/prisma-process-item.repository.js';
import { RunRepository } from '../runs/domain/repositories/run.repository.js';
import { PrismaRunRepository } from '../runs/infrastructure/repositories/prisma-run.repository.js';
import { CALLBACK_CLIENT } from './application/contracts/callback.client.js';
import { ConsolidarResultadoRunUseCase } from './application/use-cases/consolidar-resultado-run.use-case.js';
import { EnviarCallbackRunUseCase } from './application/use-cases/enviar-callback-run.use-case.js';
import { CallbackQueueModule } from './callback-queue.module.js';
import { HttpCallbackClient } from './infrastructure/clients/http-callback.client.js';
import { CallbackWorker } from './infrastructure/workers/callback.worker.js';

@Module({
  imports: [PrismaModule, PlatformCredentialsModule, CallbackQueueModule],
  providers: [
    PrismaRunRepository,
    PrismaProcessItemRepository,
    {
      provide: CALLBACK_CLIENT,
      useFactory: () =>
        new HttpCallbackClient({
          baseUrl: process.env.PLATAFORMA_BASE_URL ?? '',
        }),
    },
    {
      provide: ConsolidarResultadoRunUseCase,
      inject: [PrismaRunRepository, PrismaProcessItemRepository],
      useFactory: (runs: RunRepository, items: ProcessItemRepository) =>
        new ConsolidarResultadoRunUseCase(runs, items),
    },
    {
      provide: EnviarCallbackRunUseCase,
      inject: [
        PrismaRunRepository,
        ConsolidarResultadoRunUseCase,
        PLATFORM_AUTH_CONTEXT_STORE,
        CALLBACK_CLIENT,
      ],
      useFactory: (
        runs: RunRepository,
        consolidar: ConsolidarResultadoRunUseCase,
        authContext: PlatformAuthContextStore,
        client: HttpCallbackClient,
      ) => new EnviarCallbackRunUseCase(runs, consolidar, authContext, client),
    },
    CallbackWorker,
  ],
})
export class CallbackModule {}

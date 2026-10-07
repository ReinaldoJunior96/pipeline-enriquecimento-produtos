import { Module } from '@nestjs/common';
import { PlataformaExternaModule } from '../../infrastructure/platform/plataforma-externa.module.js';
import { PrismaModule } from '../../infrastructure/database/prisma.module.js';
import { PlatformCredentialsModule } from '../../infrastructure/platform-credentials/platform-credentials.module.js';
import { PLATAFORMA_EXTERNA_CLIENT, PlataformaExternaClient } from './application/contracts/plataforma-externa.client.js';
import { CriarLoteUseCase } from './application/use-cases/criar-lote.use-case.js';
import { RunRepository } from './domain/repositories/run.repository.js';
import { PrismaRunRepository } from './infrastructure/repositories/prisma-run.repository.js';
import { RunsController } from './runs.controller.js';
import { CREDENCIAIS_LOTE_STORE, CredenciaisLoteStore } from './application/contracts/credenciais-lote.store.js';

@Module({
  imports: [PrismaModule, PlataformaExternaModule, PlatformCredentialsModule],
  controllers: [RunsController],
  providers: [
    PrismaRunRepository,
    {
      provide: CriarLoteUseCase,
      inject: [PLATAFORMA_EXTERNA_CLIENT, PrismaRunRepository, CREDENCIAIS_LOTE_STORE],
      useFactory: (
        plataforma: PlataformaExternaClient,
        repositorio: RunRepository,
        credenciais: CredenciaisLoteStore,
      ) => new CriarLoteUseCase(plataforma, repositorio, credenciais),
    },
  ],
})
export class RunsModule {}

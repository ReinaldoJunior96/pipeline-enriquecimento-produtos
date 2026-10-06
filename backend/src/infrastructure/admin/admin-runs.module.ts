import { DynamicModule, Module } from '@nestjs/common';
import { CadastrarLoteManualUseCase } from '../../modules/runs/application/use-cases/cadastrar-lote-manual.use-case.js';
import { RunRepository } from '../../modules/runs/domain/repositories/run.repository.js';
import { PrismaRunRepository } from '../../modules/runs/infrastructure/repositories/prisma-run.repository.js';
import { PrismaModule } from '../database/prisma.module.js';
import { AdminRunsController } from './admin-runs.controller.js';

export function adminTestEndpointsEstaoAtivados(
  valor = process.env.ADMIN_TEST_ENDPOINTS_ENABLED,
): boolean {
  return valor === 'true';
}

@Module({})
export class AdminRunsModule {
  static register(ativado = adminTestEndpointsEstaoAtivados()): DynamicModule {
    return {
      module: AdminRunsModule,
      imports: ativado ? [PrismaModule] : [],
      controllers: ativado ? [AdminRunsController] : [],
      providers: ativado
        ? [
            PrismaRunRepository,
            {
              provide: CadastrarLoteManualUseCase,
              inject: [PrismaRunRepository],
              useFactory: (repositorio: RunRepository) =>
                new CadastrarLoteManualUseCase(repositorio),
            },
          ]
        : [],
    };
  }
}

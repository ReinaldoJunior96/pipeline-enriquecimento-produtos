import { Module } from '@nestjs/common';
import { ReceberItemProcessamentoUseCase } from './application/use-cases/receber-item-processamento.use-case.js';
import { ProcessingController } from './processing.controller.js';

@Module({
  controllers: [ProcessingController],
  providers: [
    {
      provide: ReceberItemProcessamentoUseCase,
      useFactory: () => new ReceberItemProcessamentoUseCase(),
    },
  ],
})
export class ProcessingModule {}

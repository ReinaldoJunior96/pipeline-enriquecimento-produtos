import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ReceberItemProcessamentoUseCase } from './application/use-cases/receber-item-processamento.use-case.js';
import { ProcessItemDto } from './dto/process-item.dto.js';

@Controller()
export class ProcessingController {
  constructor(
    private readonly receberItemProcessamento: ReceberItemProcessamentoUseCase,
  ) {}

  @Post('process')
  @HttpCode(HttpStatus.ACCEPTED)
  async process(@Body() body: ProcessItemDto) {
    return this.receberItemProcessamento.execute({
      runId: body.run_id,
      seq: body.seq,
      sku: body.sku,
    });
  }
}

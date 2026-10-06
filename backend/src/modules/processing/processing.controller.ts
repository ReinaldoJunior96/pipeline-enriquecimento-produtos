import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { ReceberItemProcessamentoUseCase } from './application/use-cases/receber-item-processamento.use-case.js';
import { ProcessItemDto } from './dto/process-item.dto.js';

@Controller()
export class ProcessingController {
  private readonly logger = new Logger(ProcessingController.name);

  constructor(
    private readonly receberItemProcessamento: ReceberItemProcessamentoUseCase,
  ) {}

  @Post('process')
  @HttpCode(HttpStatus.ACCEPTED)
  async process(@Body() body: ProcessItemDto) {
    const contexto = { runId: body.run_id, seq: body.seq, sku: body.sku };
    this.logger.log({ evento: 'process.recebido', ...contexto });

    const resposta = await this.receberItemProcessamento.execute({
      runId: body.run_id,
      seq: body.seq,
      sku: body.sku,
    });
    this.logger.log({ evento: 'process.aceito', ...contexto });
    return resposta;
  }
}

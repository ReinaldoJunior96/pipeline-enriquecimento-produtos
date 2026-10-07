import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ReceberItemProcessamentoUseCase } from './application/use-cases/receber-item-processamento.use-case.js';
import { ProcessItemDto } from './dto/process-item.dto.js';
import { ProcessAcceptedResponseDto } from './dto/process-accepted-response.dto.js';

@Controller()
@ApiTags('Processamento')
export class ProcessingController {
  private readonly logger = new Logger(ProcessingController.name);

  constructor(
    private readonly receberItemProcessamento: ReceberItemProcessamentoUseCase,
  ) {}

  @Post('process')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Recebe um item enviado pela plataforma externa',
    description:
      'A entrega é at-least-once: itens podem chegar duplicados e fora de ordem. A idempotência usa run_id + seq. O ACK é rápido; o enriquecimento ocorre de forma assíncrona. Se a run ainda não existir, o item aguarda em process-ingress.',
  })
  @ApiBody({ type: ProcessItemDto })
  @ApiAcceptedResponse({ type: ProcessAcceptedResponseDto })
  @ApiBadRequestResponse({ description: 'Payload inválido.' })
  async process(
    @Body() body: ProcessItemDto,
  ): Promise<ProcessAcceptedResponseDto> {
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

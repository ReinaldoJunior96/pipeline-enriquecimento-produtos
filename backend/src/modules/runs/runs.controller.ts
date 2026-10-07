import {
  BadGatewayException,
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CriarLoteUseCase } from './application/use-cases/criar-lote.use-case.js';
import { RunAlreadyExistsError } from './domain/errors/run-already-exists.error.js';
import { CreateBurstDto } from './dto/create-burst.dto.js';
import { CreateBurstResponseDto } from './dto/create-burst-response.dto.js';
import { PlataformaExternaClientError } from './application/contracts/plataforma-externa.client.js';

@Controller('runs')
@ApiTags('Lotes')
export class RunsController {
  private readonly logger = new Logger(RunsController.name);

  constructor(private readonly criarLote: CriarLoteUseCase) {}

  @Post('burst')
  @ApiOperation({
    summary: 'Solicita um burst e persiste a run retornada',
    description:
      'Encaminha cid e token à plataforma externa. A run é gravada localmente antes da resposta final. O token é enviado somente no header x-token e nunca é persistido ou logado.',
  })
  @ApiCreatedResponse({ type: CreateBurstResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos ou rejeitados pela plataforma.' })
  @ApiUnauthorizedResponse({ description: 'Token rejeitado pela plataforma.' })
  @ApiBadGatewayResponse({ description: 'Resposta inválida ou falha da plataforma.' })
  async burst(@Body() body: CreateBurstDto): Promise<CreateBurstResponseDto> {
    this.logger.log({ evento: 'burst.iniciado', cid: body.cid });

    try {
      const run = await this.criarLote.execute({
        cid: body.cid,
        token: body.token,
      });
      const response = {
        run_id: run.runId,
        cid: run.cid,
        total: run.total,
        started_at: run.startedAt.toISOString(),
      };
      this.logger.log({
        evento: 'burst.sucesso',
        runId: run.runId,
        cid: run.cid,
        total: run.total,
        startedAt: run.startedAt.toISOString(),
      });
      this.logger.log({
        evento: 'burst.run_persistida',
        runId: run.runId,
        cid: run.cid,
        total: run.total,
        startedAt: run.startedAt.toISOString(),
      });
      return response;
    } catch (error) {
      if (error instanceof RunAlreadyExistsError) {
        throw new ConflictException('A run retornada já está cadastrada');
      }
      if (error instanceof PlataformaExternaClientError) {
        this.logger.error({
          evento: 'burst.falha',
          cid: body.cid,
          tipo: error.tipo,
          statusExterno: error.status,
          motivo: error.message,
        });
        if (error.status === 401) {
          throw new UnauthorizedException('Token rejeitado pela plataforma');
        }
        if (error.tipo === 'VALIDACAO') {
          throw new BadRequestException(
            'A plataforma rejeitou os dados do burst',
          );
        }
        throw new BadGatewayException(
          'Não foi possível criar o lote na plataforma externa',
        );
      }
      throw error;
    }
  }
}

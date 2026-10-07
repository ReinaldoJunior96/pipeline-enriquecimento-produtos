import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CadastrarLoteManualUseCase } from '../../modules/runs/application/use-cases/cadastrar-lote-manual.use-case.js';
import { RunAlreadyExistsError } from '../../modules/runs/domain/errors/run-already-exists.error.js';
import { CreateAdminRunDto } from './dto/create-admin-run.dto.js';
import { AdminRunResponseDto } from './dto/admin-run-response.dto.js';

@Controller('admin/runs')
@ApiTags('Admin')
export class AdminRunsController {
  constructor(private readonly cadastrarLote: CadastrarLoteManualUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cadastra uma run manualmente para testes',
    description:
      'Endpoint exclusivo de desenvolvimento. No fluxo normal, use POST /runs/burst para criar e persistir a run automaticamente.',
    deprecated: true,
  })
  @ApiCreatedResponse({ type: AdminRunResponseDto })
  @ApiBadRequestResponse({ description: 'Payload inválido.' })
  @ApiConflictResponse({ description: 'A run já está cadastrada.' })
  async create(
    @Body() body: CreateAdminRunDto,
  ): Promise<AdminRunResponseDto> {
    try {
      const run = await this.cadastrarLote.execute({
        runId: body.run_id,
        cid: body.cid,
        total: body.total,
        startedAt: new Date(body.started_at),
      });

      return {
        run_id: run.runId,
        cid: run.cid,
        total: run.total,
        started_at: run.startedAt.toISOString(),
        status: run.status,
        finished_count: run.finishedCount,
        callback_sent: run.callbackSent,
      };
    } catch (error) {
      if (error instanceof RunAlreadyExistsError) {
        throw new ConflictException('Run já cadastrado');
      }
      throw error;
    }
  }
}

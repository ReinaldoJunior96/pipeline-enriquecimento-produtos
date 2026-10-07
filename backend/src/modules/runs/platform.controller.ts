import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  Inject,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  PLATAFORMA_EXTERNA_CLIENT,
  PlataformaExternaClientError,
} from './application/contracts/plataforma-externa.client.js';
import type { PlataformaExternaClient } from './application/contracts/plataforma-externa.client.js';
import { RegisterPlatformDto } from './dto/register-platform.dto.js';
import { RegisterPlatformResponseDto } from './dto/register-platform-response.dto.js';

@Controller('platform')
@ApiTags('Plataforma Externa')
export class PlatformController {
  private readonly logger = new Logger(PlatformController.name);

  constructor(
    @Inject(PLATAFORMA_EXTERNA_CLIENT)
    private readonly plataforma: PlataformaExternaClient,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registra o webhook na plataforma externa',
    description:
      'A plataforma fará o handshake automaticamente em POST {webhook}/check. Informe uma URL pública acessível por ela.',
  })
  @ApiOkResponse({ type: RegisterPlatformResponseDto })
  @ApiBadRequestResponse({ description: 'Nome ou URL do webhook inválidos.' })
  @ApiBadGatewayResponse({ description: 'A plataforma não concluiu o registro.' })
  async register(
    @Body() body: RegisterPlatformDto,
  ): Promise<RegisterPlatformResponseDto> {
    this.logger.log({ evento: 'register.iniciado', name: body.name });

    try {
      const credenciais = await this.plataforma.registrar({
        name: body.name,
        webhook: body.webhook,
      });
      this.logger.log({
        evento: 'register.sucesso',
        name: body.name,
        cid: credenciais.cid,
      });
      return credenciais;
    } catch (error) {
      this.mapearErroDaPlataforma(error);
    }
  }

  private mapearErroDaPlataforma(error: unknown): never {
    if (error instanceof PlataformaExternaClientError) {
      if (error.tipo === 'VALIDACAO') {
        throw new BadRequestException(
          'A plataforma rejeitou os dados do registro',
        );
      }
      throw new BadGatewayException(
        'Não foi possível concluir o registro na plataforma externa',
      );
    }
    throw error;
  }
}

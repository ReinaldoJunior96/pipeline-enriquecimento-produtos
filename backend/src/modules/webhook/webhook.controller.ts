import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CheckWebhookDto } from './dto/check-webhook.dto.js';

@Controller()
@ApiTags('Plataforma Externa')
export class WebhookController {
  @Post('check')
  @ApiExcludeEndpoint()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirma o handshake do webhook',
    description:
      'A plataforma chama este endpoint após o register. O token recebido é devolvido sem alteração.',
  })
  @ApiOkResponse({ type: CheckWebhookDto })
  @ApiBadRequestResponse({ description: 'Token ausente ou inválido.' })
  check(@Body() body: CheckWebhookDto): CheckWebhookDto {
    return { token: body.token };
  }
}

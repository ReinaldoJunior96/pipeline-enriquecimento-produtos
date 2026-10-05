import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CheckWebhookDto } from './dto/check-webhook.dto.js';

@Controller()
export class WebhookController {
  @Post('check')
  @HttpCode(HttpStatus.OK)
  check(@Body() body: CheckWebhookDto): CheckWebhookDto {
    return { token: body.token };
  }
}

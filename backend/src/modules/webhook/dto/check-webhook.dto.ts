import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CheckWebhookDto {
  @ApiProperty({ example: 'token-retornado-pela-plataforma' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

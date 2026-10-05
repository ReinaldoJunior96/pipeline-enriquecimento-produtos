import { IsNotEmpty, IsString } from 'class-validator';

export class CheckWebhookDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

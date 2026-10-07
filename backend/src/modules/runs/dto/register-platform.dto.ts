import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class RegisterPlatformDto {
  @ApiProperty({ example: 'Reinaldo Junior' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'https://seu-ngrok.ngrok-free.app',
    description:
      'URL pública acessível pela plataforma. O handshake será enviado para esta URL com o caminho /check.',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  webhook!: string;
}

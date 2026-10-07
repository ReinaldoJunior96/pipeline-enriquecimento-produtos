import { ApiProperty } from '@nestjs/swagger';

export class RegisterPlatformResponseDto {
  @ApiProperty({ example: 'cid-retornado-pela-plataforma' })
  cid!: string;

  @ApiProperty({
    example: 'token-retornado-pela-plataforma',
    description: 'Credencial para usar no burst. Não é persistida nem registrada em logs.',
  })
  token!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBurstDto {
  @ApiProperty({ example: 'cole-o-cid-retornado-no-register' })
  @IsString()
  @IsNotEmpty()
  cid!: string;

  @ApiProperty({
    example: 'cole-o-token-retornado-no-register',
    writeOnly: true,
    description: 'Usado somente no header x-token da chamada externa; não é persistido nem logado.',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class ProcessItemDto {
  @ApiProperty({ example: 'run-exemplo' })
  @IsString()
  @IsNotEmpty()
  run_id!: string;

  @ApiProperty({ example: 0, minimum: 0 })
  @IsInt()
  @Min(0)
  seq!: number;

  @ApiProperty({ example: 'sku-exemplo' })
  @IsString()
  @IsNotEmpty()
  sku!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateAdminRunDto {
  @ApiProperty({ example: 'run-teste-manual' })
  @ApiProperty({ example: 'cid-de-teste' })
  @IsString()
  @IsNotEmpty()
  run_id: string;

  @IsString()
  @IsNotEmpty()
  cid: string;

  @ApiProperty({ example: 20, minimum: 1 })
  @IsInt()
  @Min(1)
  total: number;

  @ApiProperty({ example: '2026-10-07T13:20:54.872Z', format: 'date-time' })
  @IsISO8601({ strict: true })
  started_at: string;
}

import { ApiProperty } from '@nestjs/swagger';

export class CreateBurstResponseDto {
  @ApiProperty({ example: 'run-exemplo' })
  run_id!: string;

  @ApiProperty({ example: 'cid-exemplo' })
  cid!: string;

  @ApiProperty({ example: 20, minimum: 1 })
  total!: number;

  @ApiProperty({
    example: '2026-10-07T13:20:54.872Z',
    format: 'date-time',
  })
  started_at!: string;
}

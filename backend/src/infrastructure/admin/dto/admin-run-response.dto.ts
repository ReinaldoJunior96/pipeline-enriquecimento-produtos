import { ApiProperty } from '@nestjs/swagger';
import type { RunStatus } from '../../../modules/runs/domain/repositories/run.repository.js';

export class AdminRunResponseDto {
  @ApiProperty({ example: 'run-teste-manual' })
  run_id!: string;

  @ApiProperty({ example: 'cid-de-teste' })
  cid!: string;

  @ApiProperty({ example: 20, minimum: 1 })
  total!: number;

  @ApiProperty({ example: '2026-10-07T13:20:54.872Z', format: 'date-time' })
  started_at!: string;

  @ApiProperty({ example: 'PROCESSING', enum: ['PROCESSING', 'COMPLETED', 'FAILED'] })
  status!: RunStatus;

  @ApiProperty({ example: 0 })
  finished_count!: number;

  @ApiProperty({ example: false })
  callback_sent!: boolean;
}

import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({
    example: '2026-10-07T13:20:54.872Z',
    format: 'date-time',
  })
  timestamp!: string;
}

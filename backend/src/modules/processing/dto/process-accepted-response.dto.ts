import { ApiProperty } from '@nestjs/swagger';

export class ProcessAcceptedResponseDto {
  @ApiProperty({ example: 'accepted', enum: ['accepted'] })
  status!: 'accepted';
}

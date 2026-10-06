import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class ProcessItemDto {
  @IsString()
  @IsNotEmpty()
  run_id!: string;

  @IsInt()
  @Min(0)
  seq!: number;

  @IsString()
  @IsNotEmpty()
  sku!: string;
}

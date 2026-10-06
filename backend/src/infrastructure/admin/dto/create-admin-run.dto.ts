import { IsISO8601, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateAdminRunDto {
  @IsString()
  @IsNotEmpty()
  run_id: string;

  @IsString()
  @IsNotEmpty()
  cid: string;

  @IsInt()
  @Min(1)
  total: number;

  @IsISO8601({ strict: true })
  started_at: string;
}

import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHireDto {
  @ApiProperty()
  @IsString()
  agentId!: string;

  @ApiProperty()
  @IsString()
  userWallet!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiProperty()
  @IsString()
  asset!: string;
}

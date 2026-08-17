import { IsOptional, IsEnum, IsBoolean, IsNumber, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  AgentCategory,
  AgentSource,
  RiskLevel,
  MarketplaceSort,
} from '@bnb-marketplace/shared-types';

export class MarketplaceQueryDto {
  @ApiPropertyOptional({ enum: AgentCategory })
  @IsOptional()
  @IsEnum(AgentCategory)
  category?: AgentCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  protocol?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  asset?: string;

  @ApiPropertyOptional({ enum: RiskLevel })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({ enum: AgentSource })
  @IsOptional()
  @IsEnum(AgentSource)
  source?: AgentSource;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  chainId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isTestnet?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumCapital?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: MarketplaceSort })
  @IsOptional()
  @IsEnum(MarketplaceSort)
  sort?: MarketplaceSort;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 100;
}

export class CompareQueryDto {
  @ApiPropertyOptional({ description: 'Comma-separated agent IDs' })
  @IsString()
  agents!: string;
}

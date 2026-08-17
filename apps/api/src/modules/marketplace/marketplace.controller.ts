import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceQueryDto, CompareQueryDto } from './dto/marketplace-query.dto';
import { AnalyticsPublicService } from '../analytics/analytics-public.service';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly analyticsService: AnalyticsPublicService,
  ) {}

  @Get('agents')
  @ApiOperation({ summary: 'List and filter marketplace agents' })
  listAgents(@Query() query: MarketplaceQueryDto) {
    return this.marketplaceService.listAgents(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get agent categories' })
  getCategories() {
    return this.marketplaceService.getCategories();
  }

  @Get('chains')
  @ApiOperation({ summary: 'Get chains with listed agents' })
  getChains() {
    return this.marketplaceService.getChains();
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured agents' })
  getFeatured() {
    return this.marketplaceService.getFeatured();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get marketplace statistics' })
  getStats() {
    return this.marketplaceService.getStats();
  }

  @Get('compare')
  @ApiOperation({ summary: 'Compare up to 3 agents' })
  compare(@Query() query: CompareQueryDto) {
    const ids = query.agents.split(',').map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0 || ids.length > 3) {
      throw new BadRequestException('Provide 1-3 agent IDs separated by commas');
    }
    return this.marketplaceService.compareAgents(ids);
  }

  @Get('agents/:id/chart')
  @ApiOperation({ summary: 'Get performance chart data for agent' })
  async getChart(@Query('id') id: string) {
    return this.analyticsService.getPerformanceChart(id);
  }
}

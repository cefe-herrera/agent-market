import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { AnalyticsPublicService } from '../analytics/analytics-public.service';
import { SecurityPublicService } from '../security/security-public.service';
import { Erc8004ReputationClient } from '../blockchain/erc8004/erc8004-reputation.client';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly analyticsService: AnalyticsPublicService,
    private readonly securityService: SecurityPublicService,
    private readonly reputation: Erc8004ReputationClient,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all agents' })
  findAll() {
    return this.agentsService.findAll();
  }

  @Get(':id/reputation')
  @ApiOperation({ summary: 'Read ERC-8004 reputation feedback for an agent token id' })
  async getReputation(@Param('id') id: string) {
    const data = await this.reputation.getReputation(id);
    if (!data) {
      throw new NotFoundException(
        `Cannot parse agent id "${id}". Use tokenId or 97:0x8004…:tokenId`,
      );
    }
    return data;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent by id or slug' })
  findOne(@Param('id') id: string) {
    return this.agentsService.findById(id);
  }

  @Get(':id/metrics')
  @ApiOperation({ summary: 'Get agent performance metrics' })
  getMetrics(@Param('id') id: string) {
    return this.analyticsService.getMetricsForAgent(id);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: 'Get agent permissions' })
  getPermissions(@Param('id') id: string) {
    return this.securityService.getPermissionsForAgent(id);
  }

  @Get(':id/chart')
  @ApiOperation({ summary: 'Get performance chart data' })
  async getChart(@Param('id') id: string) {
    const agent = await this.agentsService.findById(id);
    return this.analyticsService.getPerformanceChart(agent.id);
  }
}

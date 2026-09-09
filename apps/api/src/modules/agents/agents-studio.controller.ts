import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MarketplaceAgentDto } from '@bnb-marketplace/shared-types';
import { IndexerBnbService } from '../blockchain/indexer-bnb/indexer-bnb.service';

@ApiTags('agents')
@Controller('agents/studio')
export class AgentsStudioController {
  constructor(private readonly indexer: IndexerBnbService) {}

  @Get()
  @ApiOperation({ summary: 'List BNB Agent Studio agents from BNB indexer' })
  listStudioAgents(): Promise<MarketplaceAgentDto[]> {
    return this.indexer.listStudioAgents();
  }
}

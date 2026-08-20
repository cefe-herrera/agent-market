import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MarketplaceAgentDto } from '@bnb-marketplace/shared-types';
import { Erc8004ScanClient } from '../blockchain/erc8004/erc8004-scan.client';
import {
  buildChainMap,
  fallbackChain,
  mapScanListItemToMarketplaceAgent,
} from '../blockchain/erc8004/erc8004-agent.mapper';

@ApiTags('agents')
@Controller('agents/studio')
export class AgentsStudioController {
  constructor(private readonly scan: Erc8004ScanClient) {}

  @Get()
  @ApiOperation({ summary: 'List registered ERC-8004 agents from 8004scan' })
  async listStudioAgents(): Promise<MarketplaceAgentDto[]> {
    const [result, chains] = await Promise.all([
      this.scan.listRegisteredAgents({ limit: 100, offset: 0, isTestnet: true }),
      this.scan.getChains(),
    ]);

    const chainMap = buildChainMap(chains);
    return result.items.map((item) =>
      mapScanListItemToMarketplaceAgent(
        item,
        chainMap.get(item.chain_id) ?? fallbackChain(item.chain_id),
      ),
    );
  }
}

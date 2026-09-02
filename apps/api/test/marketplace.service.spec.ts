import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceService } from '../src/modules/marketplace/marketplace.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AgentsService } from '../src/modules/agents/agents.service';
import { AnalyticsPublicService } from '../src/modules/analytics/analytics-public.service';
import { AgentVerificationService } from '../src/modules/blockchain/erc8004/agent-verification.service';
import { mapScanListItemToMarketplaceAgent } from '../src/modules/blockchain/erc8004/erc8004-agent.mapper';
import { Erc8004ScanClient } from '../src/modules/blockchain/erc8004/erc8004-scan.client';
import { NetworkConfig } from '../src/common/network/network.config';
import { AgentCategory, AgentSource, MarketplaceSort, RiskLevel } from '@bnb-marketplace/shared-types';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let scan: {
    listRegisteredAgents: jest.Mock;
    enrichCatalogItems: jest.Mock;
    getChains: jest.Mock;
  };
  let verification: { listCatalog: jest.Mock };

  const scanItem = {
    id: 'scan-1',
    agent_id: '56:0x8004:123',
    token_id: '123',
    chain_id: 56,
    name: 'Test Agent',
    description: 'Venus yield optimisation agent',
    owner_address: '0x1',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
    is_testnet: false,
    is_verified: true,
    star_count: 5,
    supported_protocols: ['Venus'],
    x402_supported: false,
    total_score: 10,
    health_score: 80,
    total_feedbacks: 3,
    average_score: 4,
    rank: 1,
  };

  const catalogAgent = mapScanListItemToMarketplaceAgent(scanItem, {
    chainId: 56,
    name: 'BNB Chain',
    chainKey: 'bsc_mainnet',
    isTestnet: false,
  });

  beforeEach(async () => {
    scan = {
      listRegisteredAgents: jest.fn().mockResolvedValue({ items: [scanItem], total: 1 }),
      enrichCatalogItems: jest.fn(async (items) => items),
      getChains: jest.fn().mockResolvedValue([
        {
          chain_id: 56,
          name: 'BNB Chain',
          chain_key: 'bsc_mainnet',
          is_testnet: false,
          enabled: true,
        },
      ]),
    };
    verification = {
      listCatalog: jest.fn().mockResolvedValue({ data: [catalogAgent], total: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        {
          provide: AnalyticsPublicService,
          useValue: { toDto: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: {
            agent: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        { provide: Erc8004ScanClient, useValue: scan },
        { provide: AgentVerificationService, useValue: verification },
        {
          provide: NetworkConfig,
          useValue: { mode: 'mainnet', isTestnet: false, chainId: 56 },
        },
        {
          provide: AgentsService,
          useValue: { toDto: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(MarketplaceService);
  });

  it('should filter by category from verified catalog', async () => {
    const result = await service.listAgents({ category: AgentCategory.YIELD_OPTIMISATION });

    expect(verification.listCatalog).toHaveBeenCalled();
    expect(result.data.every((agent) => agent.category === AgentCategory.YIELD_OPTIMISATION)).toBe(
      true,
    );
  });

  it('should filter by protocol from verified catalog', async () => {
    const result = await service.listAgents({ protocol: 'Venus' });

    expect(result.data.every((agent) => agent.protocols.includes('Venus'))).toBe(true);
  });

  it('should filter by risk level from verified catalog', async () => {
    const result = await service.listAgents({ riskLevel: RiskLevel.MEDIUM });

    expect(result.data.every((agent) => agent.riskLevel === RiskLevel.MEDIUM)).toBe(true);
  });

  it('should return ERC8004 agents from verified catalog', async () => {
    const result = await service.listAgents({ source: AgentSource.ERC8004 });

    expect(result.data[0].source).toBe(AgentSource.ERC8004);
    expect(result.total).toBe(1);
  });

  it('should sort by highest return', async () => {
    const secondItem = {
      ...scanItem,
      id: 'scan-2',
      agent_id: '56:0x8004:124',
      token_id: '124',
      name: 'Second Agent',
    };
    const second = mapScanListItemToMarketplaceAgent(secondItem, {
      chainId: 56,
      name: 'BNB Chain',
      chainKey: 'bsc_mainnet',
      isTestnet: false,
    });
    verification.listCatalog.mockResolvedValue({ data: [catalogAgent, second], total: 2 });

    const result = await service.listAgents({ sort: MarketplaceSort.HIGHEST_RETURN });

    expect(result.data.length).toBe(2);
  });

  it('should return categories', () => {
    const categories = service.getCategories();
    expect(categories.length).toBe(4);
  });

  it('should fetch featured agents from verified catalog', async () => {
    const featured = await service.getFeatured(10);

    expect(verification.listCatalog).toHaveBeenCalledWith({
      isTestnet: false,
      limit: 10,
      offset: 0,
    });
    expect(featured.length).toBe(1);
  });

  it('should list agents for the configured network', async () => {
    await service.listAgents({});

    expect(verification.listCatalog).toHaveBeenCalledWith({
      isTestnet: false,
      limit: 100,
      offset: 0,
    });
  });

  it('should expand open 8004scan catalog when open=true', async () => {
    await service.listAgents({ open: true });

    expect(verification.listCatalog).toHaveBeenCalledWith({
      isTestnet: false,
      limit: 100,
      offset: 0,
      expandOpen: true,
    });
  });

  it('should skip verification pipeline when usable=false', async () => {
    await service.listAgents({ usable: false });

    expect(scan.listRegisteredAgents).toHaveBeenCalled();
    expect(verification.listCatalog).not.toHaveBeenCalled();
  });
});

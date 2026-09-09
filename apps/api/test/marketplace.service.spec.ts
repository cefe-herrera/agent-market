import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceService } from '../src/modules/marketplace/marketplace.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AgentsService } from '../src/modules/agents/agents.service';
import { AnalyticsPublicService } from '../src/modules/analytics/analytics-public.service';
import { IndexerBnbService } from '../src/modules/blockchain/indexer-bnb/indexer-bnb.service';
import { NetworkConfig } from '../src/common/network/network.config';
import { AgentCategory, AgentSource, MarketplaceSort, RiskLevel } from '@bnb-marketplace/shared-types';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let indexer: { listAgents: jest.Mock; countRegistered: jest.Mock };

  const catalogAgent = {
    id: 'scan-1',
    agentId: '56:0x8004:123',
    name: 'Test Agent',
    description: 'Venus yield optimisation agent',
    shortDescription: 'Venus yield optimisation agent',
    slug: 'test-agent-123',
    ownerWallet: '0x1',
    agentWallet: '0x1',
    agentUri: null,
    imageUrl: null,
    network: 'BSC',
    chainId: 56,
    isTestnet: false,
    source: AgentSource.ERC8004,
    publishedAt: '2026-01-01T00:00:00.000Z',
    status: 'LISTED',
    verified: false,
    category: AgentCategory.YIELD_OPTIMISATION,
    protocols: ['ERC-8004', 'Venus'],
    supportedAssets: [],
    strategyName: 'Test Agent',
    strategyDescription: 'Venus yield optimisation agent',
    riskLevel: RiskLevel.MEDIUM,
    minimumCapital: 0,
    recommendedCapital: 0,
    executionFrequency: 'On demand',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    indexer = {
      listAgents: jest.fn().mockResolvedValue({
        data: [catalogAgent],
        total: 1,
        page: 1,
        limit: 100,
        registered: 1,
        consumable: 1,
        filteredOut: 0,
      }),
      countRegistered: jest.fn().mockResolvedValue(1),
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
        { provide: IndexerBnbService, useValue: indexer },
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

  it('should filter by category from indexer catalog', async () => {
    const result = await service.listAgents({ category: AgentCategory.YIELD_OPTIMISATION });

    expect(indexer.listAgents).toHaveBeenCalled();
    expect(result.data.every((agent) => agent.category === AgentCategory.YIELD_OPTIMISATION)).toBe(
      true,
    );
  });

  it('should filter by protocol from indexer catalog', async () => {
    const result = await service.listAgents({ protocol: 'Venus' });

    expect(result.data.every((agent) => agent.protocols.includes('Venus'))).toBe(true);
  });

  it('should filter by risk level from indexer catalog', async () => {
    const result = await service.listAgents({ riskLevel: RiskLevel.MEDIUM });

    expect(result.data.every((agent) => agent.riskLevel === RiskLevel.MEDIUM)).toBe(true);
  });

  it('should return ERC8004 agents from indexer catalog', async () => {
    const result = await service.listAgents({ source: AgentSource.ERC8004 });

    expect(result.data[0].source).toBe(AgentSource.ERC8004);
    expect(result.total).toBe(1);
  });

  it('should sort by highest return', async () => {
    const second = { ...catalogAgent, id: 'scan-2', agentId: '56:0x8004:124', name: 'Second Agent' };
    indexer.listAgents.mockResolvedValue({
      data: [catalogAgent, second],
      total: 2,
      page: 1,
      limit: 100,
    });

    const result = await service.listAgents({ sort: MarketplaceSort.HIGHEST_RETURN });

    expect(result.data.length).toBe(2);
  });

  it('should return categories', () => {
    const categories = service.getCategories();
    expect(categories.length).toBe(4);
  });

  it('should fetch featured agents from indexer', async () => {
    const featured = await service.getFeatured(10);

    expect(indexer.listAgents).toHaveBeenCalledWith({
      usable: true,
      limit: 10,
      page: 1,
      chainId: 56,
      isTestnet: false,
    });
    expect(featured.length).toBe(1);
  });

  it('should list agents for the configured network', async () => {
    await service.listAgents({});

    const callArg = indexer.listAgents.mock.calls[0]?.[0] as
      | { page?: number; limit?: number; chainId?: number; isTestnet?: boolean }
      | undefined;
    expect(callArg?.page).toBe(1);
    expect(callArg?.limit).toBe(100);
    expect(callArg?.chainId).toBe(56);
    expect(callArg?.isTestnet).toBe(false);
  });

  it('should expand open indexer catalog when open=true', async () => {
    await service.listAgents({ open: true });

    const callArg = indexer.listAgents.mock.calls[0]?.[0] as { open?: boolean } | undefined;
    expect(callArg?.open).toBe(true);
  });

  it('should request raw indexer dump when usable=false', async () => {
    await service.listAgents({ usable: false });

    const callArg = indexer.listAgents.mock.calls[0]?.[0] as { usable?: boolean } | undefined;
    expect(callArg?.usable).toBe(false);
  });
});

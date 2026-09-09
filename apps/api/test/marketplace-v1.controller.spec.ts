import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { MarketplaceV1Controller } from '../src/modules/marketplace/marketplace-v1.controller';
import { MarketplaceService } from '../src/modules/marketplace/marketplace.service';
import { AgentsService } from '../src/modules/agents/agents.service';
import { IndexerBnbService } from '../src/modules/blockchain/indexer-bnb/indexer-bnb.service';
import { AgentCardPreviewService } from '../src/modules/marketplace/agent-card-preview.service';

describe('MarketplaceV1Controller', () => {
  let controller: MarketplaceV1Controller;
  let marketplace: jest.Mocked<MarketplaceService>;
  let agents: jest.Mocked<AgentsService>;
  let indexer: jest.Mocked<IndexerBnbService>;
  let cards: jest.Mocked<AgentCardPreviewService>;

  beforeEach(() => {
    marketplace = {
      listAgents: jest.fn(),
      getFeatured: jest.fn(),
      getStats: jest.fn(),
    } as unknown as jest.Mocked<MarketplaceService>;
    agents = {
      findById: jest.fn(),
      getA2aHealth: jest.fn(),
    } as unknown as jest.Mocked<AgentsService>;
    indexer = {
      getReputation: jest.fn(),
    } as unknown as jest.Mocked<IndexerBnbService>;
    cards = {
      fetchAgentCardPreview: jest.fn(),
    } as unknown as jest.Mocked<AgentCardPreviewService>;

    controller = new MarketplaceV1Controller(
      marketplace,
      agents,
      indexer,
      cards,
    );
  });

  it('forwards q param into search', async () => {
    marketplace.listAgents.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    await controller.search({} as never, 'robot');
    const firstCallArg = marketplace.listAgents.mock.calls[0]?.[0] as
      | { search?: string }
      | undefined;
    expect(firstCallArg?.search).toBe('robot');
  });

  it('maps indexer failures to bad gateway', async () => {
    marketplace.getStats.mockRejectedValue(new Error('Indexer HTTP 502'));
    let error: unknown;
    try {
      await controller.getStats();
    } catch (caught) {
      error = caught;
    }
    expect(error instanceof BadGatewayException).toBe(true);
  });

  it('throws not found when card preview cannot be resolved', async () => {
    cards.fetchAgentCardPreview.mockResolvedValue(null);
    let error: unknown;
    try {
      await controller.getCard('agent-1');
    } catch (caught) {
      error = caught;
    }
    expect(error instanceof NotFoundException).toBe(true);
  });
});

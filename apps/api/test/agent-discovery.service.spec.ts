import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AgentDiscoveryService } from '../src/modules/agents/agent-discovery.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AGENT_REGISTRY_PROVIDER } from '../src/modules/blockchain/interfaces/agent-registry.provider';
import { MockAgentRegistryProvider } from '../src/modules/blockchain/providers/mock-agent-registry.provider';
import { DOMAIN_EVENT_EMITTER } from '../src/common/events/domain-event.emitter';
import { AgentSource } from '@bnb-marketplace/shared-types';

describe('AgentDiscoveryService', () => {
  let service: AgentDiscoveryService;
  let prisma: {
    agent: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      deleteMany: jest.Mock;
    };
    agentHire: { deleteMany: jest.Mock };
    agentPermission: { deleteMany: jest.Mock };
    agentMetrics: {
      update: jest.Mock;
      create: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let emit: jest.Mock;

  beforeEach(async () => {
    prisma = {
      agent: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      agentHire: { deleteMany: jest.fn() },
      agentPermission: { deleteMany: jest.fn() },
      agentMetrics: {
        update: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    emit = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentDiscoveryService,
        MockAgentRegistryProvider,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: () => 'false' } },
        { provide: AGENT_REGISTRY_PROVIDER, useExisting: MockAgentRegistryProvider },
        { provide: DOMAIN_EVENT_EMITTER, useValue: { emit } },
      ],
    }).compile();

    service = module.get(AgentDiscoveryService);
  });

  it('should import new registry agents from 8004scan', async () => {
    prisma.agent.findUnique.mockResolvedValue(null);
    prisma.agent.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'new-id', agentId: data.agentId }),
    );

    const result = await service.syncFromRegistry();

    expect(result.discovered).toBe(4);
    expect(result.updated).toBe(0);
    expect(prisma.agent.create).toHaveBeenCalledTimes(4);
    expect(emit).toHaveBeenCalled();
  });

  it('should update existing registry agents', async () => {
    prisma.agent.findUnique.mockResolvedValue({
      id: 'existing-id',
      source: AgentSource.ERC8004,
      metrics: { id: 'metrics-id' },
    });
    prisma.agent.update.mockResolvedValue({});
    prisma.agentMetrics.update.mockResolvedValue({});

    const result = await service.syncFromRegistry();

    expect(result.discovered).toBe(0);
    expect(result.updated).toBe(4);
    expect(prisma.agent.update).toHaveBeenCalledTimes(4);
  });

  it('should skip seed agents with conflicting agentId', async () => {
    prisma.agent.findUnique.mockResolvedValue({
      id: 'seed-id',
      source: AgentSource.MARKETPLACE_SEED,
      metrics: null,
    });

    const result = await service.syncFromRegistry();

    expect(result.skipped).toBe(4);
    expect(prisma.agent.create).not.toHaveBeenCalled();
    expect(prisma.agent.update).not.toHaveBeenCalled();
  });
});

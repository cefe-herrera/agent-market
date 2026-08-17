import { Test, TestingModule } from '@nestjs/testing';
import { HiringService } from '../src/modules/hiring/hiring.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AgentsService } from '../src/modules/agents/agents.service';
import { AGENT_HIRING_PROVIDER } from '../src/modules/hiring/interfaces/agent-hiring.provider';
import { DOMAIN_EVENT_EMITTER } from '../src/common/events/domain-event.emitter';
import { HireStatus } from '@bnb-marketplace/shared-types';

describe('HiringService', () => {
  let service: HiringService;
  let prisma: jest.Mocked<PrismaService>;

  const mockAgent = {
    id: 'agent-1',
    agentId: 'agent-001',
    name: 'Test Agent',
    slug: 'test-agent',
    description: 'Test',
    shortDescription: 'Test',
    imageUrl: null,
    ownerWallet: '0x1',
    agentWallet: '0x2',
    agentUri: null,
    network: 'BNB Chain',
    status: 'VERIFIED',
    verified: true,
    category: 'REBALANCING',
    protocols: ['PancakeSwap'],
    supportedAssets: ['USDT'],
    strategyName: 'Test',
    strategyDescription: 'Test',
    riskLevel: 'LOW',
    minimumCapital: 100,
    recommendedCapital: 500,
    executionFrequency: 'Daily',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HiringService,
        {
          provide: AgentsService,
          useValue: {
            findById: jest.fn().mockResolvedValue(mockAgent),
            toDto: jest.fn().mockReturnValue(mockAgent),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            agentHire: {
              create: jest.fn(),
              update: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: AGENT_HIRING_PROVIDER,
          useValue: {
            hireAgent: jest.fn().mockResolvedValue({
              hireId: 'hire-1',
              status: HireStatus.ACTIVE,
              activatedAt: new Date().toISOString(),
            }),
            revokeAgent: jest.fn(),
          },
        },
        {
          provide: DOMAIN_EVENT_EMITTER,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(HiringService);
    prisma = module.get(PrismaService);
  });

  it('should create a hire', async () => {
    const hire = {
      id: 'hire-1',
      agentId: 'agent-1',
      userWallet: '0xUser',
      amount: 500,
      asset: 'USDT',
      status: 'PENDING',
      createdAt: new Date(),
      activatedAt: null,
      cancelledAt: null,
    };

    (prisma.agentHire.create as jest.Mock).mockResolvedValue(hire);
    (prisma.agentHire.update as jest.Mock).mockResolvedValue({
      ...hire,
      status: 'ACTIVE',
      activatedAt: new Date(),
      agent: mockAgent,
    });

    const result = await service.createHire({
      agentId: 'agent-1',
      userWallet: '0xUser',
      amount: 500,
      asset: 'USDT',
    });

    expect(result.status).toBe(HireStatus.ACTIVE);
    expect(prisma.agentHire.create).toHaveBeenCalled();
  });
});

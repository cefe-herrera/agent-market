import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AgentSource,
  AgentStudioSyncResult,
  DOMAIN_EVENTS,
} from '@bnb-marketplace/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  AGENT_REGISTRY_PROVIDER,
  AgentRegistryProvider,
} from '../blockchain/interfaces/agent-registry.provider';
import {
  mapExternalAgentToCreateInput,
  mapExternalAgentToUpdateInput,
  mapExternalMetrics,
} from './agent-studio.mapper';
import {
  DOMAIN_EVENT_EMITTER,
  DomainEventEmitter,
} from '../../common/events/domain-event.emitter';

const REGISTRY_SOURCES: AgentSource[] = [
  AgentSource.ERC8004,
  AgentSource.BNB_AGENT_STUDIO,
];

@Injectable()
export class AgentDiscoveryService {
  private readonly logger = new Logger(AgentDiscoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(AGENT_REGISTRY_PROVIDER)
    private readonly registry: AgentRegistryProvider,
    @Inject(DOMAIN_EVENT_EMITTER)
    private readonly events: DomainEventEmitter,
  ) {}

  async purgeSeedAgents(): Promise<number> {
    const shouldPurge = this.config.get<string>('AGENT_STUDIO_PURGE_SEED', 'true');
    if (shouldPurge !== 'true') return 0;

    const seedAgents = await this.prisma.agent.findMany({
      where: { source: AgentSource.MARKETPLACE_SEED },
      select: { id: true },
    });

    if (!seedAgents.length) return 0;

    const ids = seedAgents.map((a) => a.id);
    await this.prisma.agentHire.deleteMany({ where: { agentId: { in: ids } } });
    await this.prisma.agentPermission.deleteMany({ where: { agentId: { in: ids } } });
    await this.prisma.agentMetrics.deleteMany({ where: { agentId: { in: ids } } });
    const result = await this.prisma.agent.deleteMany({
      where: { source: AgentSource.MARKETPLACE_SEED },
    });

    this.logger.log(`Purged ${result.count} seeded demo agents`);
    return result.count;
  }

  async purgeMockRegistryAgents(): Promise<number> {
    const mockAgents = await this.prisma.agent.findMany({
      where: {
        source: { in: REGISTRY_SOURCES },
        OR: [
          { agentId: { startsWith: 'erc8004-' } },
          { NOT: { agentId: { contains: ':' } } },
        ],
      },
      select: { id: true },
    });

    if (!mockAgents.length) return 0;

    const ids = mockAgents.map((a) => a.id);
    await this.prisma.agentHire.deleteMany({ where: { agentId: { in: ids } } });
    await this.prisma.agentPermission.deleteMany({ where: { agentId: { in: ids } } });
    await this.prisma.agentMetrics.deleteMany({ where: { agentId: { in: ids } } });
    const result = await this.prisma.agent.deleteMany({ where: { id: { in: ids } } });

    this.logger.log(`Purged ${result.count} mock registry agents`);
    return result.count;
  }

  async purgeStaleRegistryAgents(syncedAgentIds: string[]): Promise<number> {
    if (!syncedAgentIds.length) return 0;

    const stale = await this.prisma.agent.findMany({
      where: {
        source: { in: REGISTRY_SOURCES },
        agentId: { notIn: syncedAgentIds },
      },
      select: { id: true },
    });

    if (!stale.length) return 0;

    const ids = stale.map((a) => a.id);
    await this.prisma.agentHire.deleteMany({ where: { agentId: { in: ids } } });
    await this.prisma.agentPermission.deleteMany({ where: { agentId: { in: ids } } });
    await this.prisma.agentMetrics.deleteMany({ where: { agentId: { in: ids } } });
    const result = await this.prisma.agent.deleteMany({ where: { id: { in: ids } } });

    this.logger.log(`Purged ${result.count} stale registry agents not in latest sync`);
    return result.count;
  }

  async syncFromRegistry(): Promise<AgentStudioSyncResult> {
    if ('clearCache' in this.registry && typeof this.registry.clearCache === 'function') {
      this.registry.clearCache();
    }

    const externalAgents = await this.registry.getAgents();
    let discovered = 0;
    let updated = 0;
    let skipped = 0;

    for (const external of externalAgents) {
      const existing = await this.prisma.agent.findUnique({
        where: { agentId: external.agentId },
        include: { metrics: true },
      });

      const metricsData = mapExternalMetrics(external);

      if (!existing) {
        const data = mapExternalAgentToCreateInput(external);
        const agent = await this.prisma.agent.create({
          data: {
            ...data,
            metrics: { create: metricsData },
          },
        });
        this.events.emit(DOMAIN_EVENTS.AGENT_DISCOVERED, {
          agentId: agent.agentId,
          source: AgentSource.ERC8004,
        });
        discovered++;
        continue;
      }

      if (!REGISTRY_SOURCES.includes(existing.source as AgentSource)) {
        skipped++;
        continue;
      }

      await this.prisma.agent.update({
        where: { id: existing.id },
        data: {
          ...mapExternalAgentToUpdateInput(external),
          source: AgentSource.ERC8004,
        },
      });

      if (existing.metrics) {
        await this.prisma.agentMetrics.update({
          where: { agentId: existing.id },
          data: metricsData,
        });
      } else {
        await this.prisma.agentMetrics.create({
          data: { ...metricsData, agentId: existing.id },
        });
      }

      updated++;
    }

    const purgedStale = await this.purgeStaleRegistryAgents(
      externalAgents.map((agent) => agent.agentId),
    );

    return {
      discovered,
      updated,
      skipped,
      purged: purgedStale,
      total: externalAgents.length,
    };
  }

  /** @deprecated use syncFromRegistry */
  async syncFromStudio(): Promise<AgentStudioSyncResult> {
    return this.syncFromRegistry();
  }

  async listRegistryAgents() {
    return this.prisma.agent.findMany({
      where: {
        source: { in: REGISTRY_SOURCES },
        status: { not: 'INACTIVE' },
      },
      include: { metrics: true },
      orderBy: { publishedAt: 'desc' },
    });
  }

  /** @deprecated use listRegistryAgents */
  async listStudioAgents() {
    return this.listRegistryAgents();
  }
}

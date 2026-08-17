import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AgentPermissionDto } from '@bnb-marketplace/shared-types';
import { AgentPermission } from '@prisma/client';
import { AgentLookupService } from '../../common/agents/agent-lookup.service';
import { Erc8004AgentResolver } from '../blockchain/erc8004/erc8004-agent.resolver';

@Injectable()
export class SecurityService {
  constructor(private readonly prisma: PrismaService) {}

  async getPermissionsByAgentId(agentDbId: string): Promise<AgentPermission[]> {
    return this.prisma.agentPermission.findMany({ where: { agentId: agentDbId } });
  }
}

@Injectable()
export class SecurityPublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentLookup: AgentLookupService,
    private readonly scanResolver: Erc8004AgentResolver,
  ) {}

  async getPermissionsForAgent(idOrSlug: string): Promise<AgentPermissionDto[]> {
    try {
      const agent = await this.agentLookup.findByIdOrSlug(idOrSlug);
      const permissions = await this.prisma.agentPermission.findMany({
        where: { agentId: agent.id },
        orderBy: [{ allowed: 'desc' }, { permissionType: 'asc' }],
      });
      return permissions.map((p) => this.toDto(p));
    } catch (error) {
      if (!(error instanceof NotFoundException)) throw error;
    }

    const scanAgent = await this.scanResolver.resolveByIdOrSlug(idOrSlug);
    if (scanAgent) return [];

    throw new NotFoundException(`Agent ${idOrSlug} not found`);
  }

  toDto(permission: AgentPermission): AgentPermissionDto {
    return {
      id: permission.id,
      agentId: permission.agentId,
      permissionType: permission.permissionType as AgentPermissionDto['permissionType'],
      contractAddress: permission.contractAddress,
      protocol: permission.protocol,
      spendLimit: permission.spendLimit,
      spendAsset: permission.spendAsset,
      expiration: permission.expiration?.toISOString() ?? null,
      description: permission.description,
      allowed: permission.allowed,
    };
  }
}

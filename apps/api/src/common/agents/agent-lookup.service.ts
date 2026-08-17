import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Agent } from '@prisma/client';

@Injectable()
export class AgentLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdOrSlug(idOrSlug: string): Promise<Agent> {
    const agent = await this.prisma.agent.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }, { agentId: idOrSlug }] },
    });
    if (!agent) throw new NotFoundException(`Agent ${idOrSlug} not found`);
    return agent;
  }
}

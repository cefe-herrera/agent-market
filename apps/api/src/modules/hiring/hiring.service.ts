import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AgentHireDto, HireStatus, DOMAIN_EVENTS } from '@bnb-marketplace/shared-types';
import { AgentHire } from '@prisma/client';
import { AgentsService } from '../agents/agents.service';
import {
  AGENT_HIRING_PROVIDER,
  AgentHiringProvider,
} from './interfaces/agent-hiring.provider';
import { DOMAIN_EVENT_EMITTER, DomainEventEmitter } from '../../common/events/domain-event.emitter';
import { CreateHireDto } from './dto/create-hire.dto';

@Injectable()
export class HiringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentsService: AgentsService,
    @Inject(AGENT_HIRING_PROVIDER) private readonly hiringProvider: AgentHiringProvider,
    @Inject(DOMAIN_EVENT_EMITTER) private readonly events: DomainEventEmitter,
  ) {}

  async createHire(dto: CreateHireDto): Promise<AgentHireDto> {
    const agent = await this.agentsService.findById(dto.agentId);

    if (dto.amount < agent.minimumCapital) {
      throw new BadRequestException(
        `Minimum capital for this agent is ${agent.minimumCapital} ${dto.asset}`,
      );
    }

    if (!agent.supportedAssets.includes(dto.asset)) {
      throw new BadRequestException(`Asset ${dto.asset} is not supported by this agent`);
    }

    const hire = await this.prisma.agentHire.create({
      data: {
        agentId: agent.id,
        userWallet: dto.userWallet,
        amount: dto.amount,
        asset: dto.asset,
        status: 'PENDING',
      },
    });

    this.events.emit(DOMAIN_EVENTS.AGENT_HIRED, {
      hireId: hire.id,
      agentId: agent.id,
      userWallet: dto.userWallet,
    });

    const providerResult = await this.hiringProvider.hireAgent({
      agentId: agent.id,
      userWallet: dto.userWallet,
      amount: dto.amount,
      asset: dto.asset,
    });

    const updated = await this.prisma.agentHire.update({
      where: { id: hire.id },
      data: {
        status: providerResult.status,
        activatedAt: providerResult.activatedAt
          ? new Date(providerResult.activatedAt)
          : new Date(),
      },
      include: { agent: true },
    });

    this.events.emit(DOMAIN_EVENTS.AGENT_ACTIVATED, {
      hireId: updated.id,
      agentId: agent.id,
    });

    return this.toDto(updated);
  }

  async getHire(id: string): Promise<AgentHireDto> {
    const hire = await this.prisma.agentHire.findUnique({
      where: { id },
      include: { agent: true },
    });
    if (!hire) throw new NotFoundException(`Hire ${id} not found`);
    return this.toDto(hire);
  }

  async getHiresByWallet(wallet: string): Promise<AgentHireDto[]> {
    const hires = await this.prisma.agentHire.findMany({
      where: { userWallet: wallet },
      include: { agent: true },
      orderBy: { createdAt: 'desc' },
    });
    return hires.map((h) => this.toDto(h));
  }

  async pauseHire(id: string): Promise<AgentHireDto> {
    const hire = await this.getHire(id);
    if (hire.status !== HireStatus.ACTIVE) {
      throw new BadRequestException('Only active hires can be paused');
    }

    const updated = await this.prisma.agentHire.update({
      where: { id },
      data: { status: 'PAUSED' },
      include: { agent: true },
    });

    this.events.emit(DOMAIN_EVENTS.AGENT_PAUSED, { hireId: id });
    return this.toDto(updated);
  }

  async revokeHire(id: string): Promise<AgentHireDto> {
    const hire = await this.getHire(id);
    if (hire.status === HireStatus.REVOKED || hire.status === HireStatus.COMPLETED) {
      throw new BadRequestException('Hire is already terminated');
    }

    await this.hiringProvider.revokeAgent(id);

    const updated = await this.prisma.agentHire.update({
      where: { id },
      data: { status: 'REVOKED', cancelledAt: new Date() },
      include: { agent: true },
    });

    this.events.emit(DOMAIN_EVENTS.AGENT_REVOKED, { hireId: id });
    return this.toDto(updated);
  }

  toDto(hire: AgentHire & { agent?: { id: string; name: string; slug: string; category: string; riskLevel: string; verified: boolean; protocols: string[]; minimumCapital: number; recommendedCapital: number; strategyName: string; strategyDescription: string; supportedAssets: string[]; agentId: string; description: string; shortDescription: string; imageUrl: string | null; ownerWallet: string; agentWallet: string; agentUri: string | null; network: string; status: string; executionFrequency: string; createdAt: Date; updatedAt: Date } }): AgentHireDto {
    const dto: AgentHireDto = {
      id: hire.id,
      agentId: hire.agentId,
      userWallet: hire.userWallet,
      amount: hire.amount,
      asset: hire.asset,
      status: hire.status as AgentHireDto['status'],
      createdAt: hire.createdAt.toISOString(),
      activatedAt: hire.activatedAt?.toISOString() ?? null,
      cancelledAt: hire.cancelledAt?.toISOString() ?? null,
    };

    if (hire.agent) {
      dto.agent = this.agentsService.toDto(hire.agent as Parameters<typeof this.agentsService.toDto>[0]);
    }

    return dto;
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MarketplaceAgentDto } from '@bnb-marketplace/shared-types';
import { AgentsService } from '../agents/agents.service';

export type AgentCardSkillDto = {
  id: string | null;
  name: string;
  description: string | null;
  tags: string[];
};

export type AgentCardPreviewDto = {
  sourceUrl: string;
  name: string | null;
  description: string | null;
  endpoint: string | null;
  provider: string | null;
  documentationUrl: string | null;
  x402: boolean;
  protocolVersion: string | null;
  preferredTransport: string | null;
  skills: AgentCardSkillDto[];
  interfaces: { transport: string | null; url: string }[];
  card: Record<string, unknown>;
};

@Injectable()
export class AgentCardPreviewService {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly config: ConfigService,
  ) {}

  async fetchAgentCardPreview(id: string): Promise<AgentCardPreviewDto | null> {
    const agent = await this.agentsService.findById(id);
    const urls = this.cardCandidateUrls(agent);
    for (const url of urls) {
      const card = await this.getJson(url);
      if (!card) continue;
      if (!this.looksLikeAgentCard(card)) continue;
      return this.toPreview(url, card);
    }
    return null;
  }

  private cardCandidateUrls(agent: MarketplaceAgentDto): string[] {
    const urls: string[] = [];
    const push = (value: string | null | undefined) => {
      if (!value || !/^https?:\/\//i.test(value)) return;
      if (value.includes('{')) return;
      if (!urls.includes(value)) urls.push(value);
    };

    const a2a = agent.endpoints?.a2a ?? agent.a2a?.endpoint ?? null;
    const mcp = agent.endpoints?.mcp ?? null;
    push(a2a);
    push(agent.agentUri);
    push(mcp);

    for (const base of [a2a, agent.agentUri, mcp, agent.endpoints?.agentUrl]) {
      if (!base) continue;
      try {
        push(new URL('/.well-known/agent-card.json', new URL(base).origin).href);
      } catch {
        // ignore invalid urls
      }
    }
    return urls;
  }

  private looksLikeAgentCard(raw: Record<string, unknown>): boolean {
    if (typeof raw.name === 'string' && typeof raw.url === 'string') return true;
    if (Array.isArray(raw.skills) && raw.skills.length > 0) return true;
    if (raw.capabilities && typeof raw.capabilities === 'object') return true;
    return false;
  }

  private toPreview(
    sourceUrl: string,
    card: Record<string, unknown>,
  ): AgentCardPreviewDto {
    const capabilities =
      card.capabilities && typeof card.capabilities === 'object'
        ? (card.capabilities as Record<string, unknown>)
        : null;
    const provider =
      card.provider && typeof card.provider === 'object'
        ? (card.provider as Record<string, unknown>)
        : null;
    return {
      sourceUrl,
      name: this.stringField(card.name),
      description: this.stringField(card.description),
      endpoint: this.stringField(card.url),
      provider:
        this.stringField(provider?.organization) ?? this.stringField(provider?.name),
      documentationUrl:
        this.stringField(card.documentationUrl) ?? this.stringField(provider?.url),
      x402:
        capabilities?.x402 === true ||
        card.x402 === true ||
        card.x402Support === true,
      protocolVersion: this.stringField(card.protocolVersion) ?? this.stringField(card.version),
      preferredTransport: this.stringField(card.preferredTransport),
      skills: this.parseSkills(card.skills),
      interfaces: this.parseInterfaces(card.additionalInterfaces),
      card,
    };
  }

  private parseSkills(value: unknown): AgentCardSkillDto[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((skill) => {
        if (typeof skill === 'string') {
          return { id: null, name: skill, description: null, tags: [] };
        }
        if (!skill || typeof skill !== 'object') return null;
        const rec = skill as Record<string, unknown>;
        const name = this.stringField(rec.name) ?? this.stringField(rec.id);
        if (!name) return null;
        return {
          id: this.stringField(rec.id),
          name,
          description: this.stringField(rec.description),
          tags: Array.isArray(rec.tags)
            ? rec.tags.filter((tag): tag is string => typeof tag === 'string')
            : [],
        };
      })
      .filter((skill): skill is AgentCardSkillDto => Boolean(skill));
  }

  private parseInterfaces(
    value: unknown,
  ): { transport: string | null; url: string }[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const rec = item as Record<string, unknown>;
        const url = this.stringField(rec.url);
        if (!url || !/^https?:\/\//i.test(url)) return null;
        return {
          transport: this.stringField(rec.transport) ?? this.stringField(rec.protocol),
          url,
        };
      })
      .filter(
        (item): item is { transport: string | null; url: string } => Boolean(item),
      );
  }

  private stringField(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private async getJson(url: string): Promise<Record<string, unknown> | null> {
    const timeoutMs = Number(this.config.get('AGENT_CARD_TIMEOUT_MS', '8000'));
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as unknown;
      if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
      return json as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

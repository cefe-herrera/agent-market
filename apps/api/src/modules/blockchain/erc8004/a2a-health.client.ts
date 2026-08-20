import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { A2aHealthDto } from '@bnb-marketplace/shared-types';
import {
  emptyA2aHealth,
  isAgentCardPayload,
  parseAgentCard,
} from './a2a-health';

@Injectable()
export class A2aHealthClient {
  private readonly logger = new Logger(A2aHealthClient.name);

  constructor(private readonly config: ConfigService) {}

  async probe(endpoint: string | null | undefined): Promise<A2aHealthDto> {
    const url = endpoint?.trim() || null;
    if (!url) {
      return emptyA2aHealth(null, 'missing', { error: 'No A2A endpoint in ERC-8004 registration' });
    }

    const timeoutMs = Number(this.config.get('A2A_HEALTH_TIMEOUT_MS', '4000'));
    const started = Date.now();

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const latencyMs = Date.now() - started;
      const checkedAt = new Date().toISOString();

      if (!response.ok) {
        return emptyA2aHealth(url, 'unhealthy', {
          latencyMs,
          checkedAt,
          error: `HTTP ${response.status} ${response.statusText}`,
        });
      }

      const json: unknown = await response.json();
      if (!isAgentCardPayload(json)) {
        return emptyA2aHealth(url, 'unhealthy', {
          latencyMs,
          checkedAt,
          error: 'Response is not an A2A agent-card',
        });
      }

      return {
        ...emptyA2aHealth(url, 'healthy', {
          latencyMs,
          checkedAt,
          ...parseAgentCard(json),
        }),
        healthy: true,
      };
    } catch (error) {
      const latencyMs = Date.now() - started;
      const message = error instanceof Error ? error.message : 'A2A probe failed';
      this.logger.debug(`A2A unhealthy ${url}: ${message}`);
      return emptyA2aHealth(url, 'unhealthy', {
        latencyMs,
        checkedAt: new Date().toISOString(),
        error: message,
      });
    }
  }
}

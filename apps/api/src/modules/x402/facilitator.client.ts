import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FacilitatorResponse } from './x402.types';

@Injectable()
export class FacilitatorClient {
  private readonly logger = new Logger(FacilitatorClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (
      this.config.get<string>('FACILITATOR_URL') ?? 'http://127.0.0.1:8080'
    ).replace(/\/$/, '');
    this.timeoutMs = Number(
      this.config.get<string>('FACILITATOR_TIMEOUT_MS') ?? '15000',
    );
  }

  async verify(body: unknown): Promise<FacilitatorResponse> {
    return this.post('/verify', body);
  }

  async settle(body: unknown): Promise<FacilitatorResponse> {
    return this.post('/settle', body);
  }

  private async post(path: '/verify' | '/settle', body: unknown): Promise<FacilitatorResponse> {
    const url = `${this.baseUrl}${path}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      const text = await res.text();
      let json: unknown = null;
      try {
        json = text ? (JSON.parse(text) as unknown) : null;
      } catch {
        json = null;
      }
      if (!res.ok) {
        this.logger.warn(`Facilitator ${path} failed with status ${res.status}`);
      }
      return { ok: res.ok, status: res.status, json, text };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Facilitator ${path} network error: ${message}`);
      return {
        ok: false,
        status: 502,
        json: { error: message, upstream: 'facilitator' },
        text: message,
      };
    }
  }
}

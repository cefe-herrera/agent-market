import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IndexerHttpError } from './indexer-bnb.types';

@Injectable()
export class IndexerBnbClient {
  private readonly logger = new Logger(IndexerBnbClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (
      this.config.get<string>('INDEXER_BNB_URL') ??
      this.config.get<string>('NEXT_PUBLIC_INDEXER_BNB_URL') ??
      ''
    ).replace(/\/$/, '');
    if (!this.baseUrl) {
      throw new Error('Missing INDEXER_BNB_URL in env');
    }
    this.timeoutMs = Number(this.config.get('INDEXER_BNB_TIMEOUT_MS', '30000'));
  }

  origin(): string {
    return this.baseUrl;
  }

  async get(path: string): Promise<{ status: number; json: unknown }> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      const text = await res.text();
      if (!text) return { status: res.status, json: null };
      try {
        return { status: res.status, json: JSON.parse(text) as unknown };
      } catch {
        return { status: res.status, json: { text } };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Indexer GET ${path} failed: ${message}`);
      throw new IndexerHttpError(502, { error: message, upstream: 'indexer-bnb' });
    }
  }

  async getJson(path: string): Promise<unknown> {
    const { status, json } = await this.get(path);
    if (status === 404) return null;
    if (status >= 400) throw new IndexerHttpError(status, json);
    return json;
  }
}

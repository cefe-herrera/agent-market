import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentVerificationService } from './agent-verification.service';

@Injectable()
export class AgentVerificationScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentVerificationScheduler.name);
  private timeout: NodeJS.Timeout | null = null;
  private interval: NodeJS.Timeout | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly verification: AgentVerificationService,
  ) {}

  onModuleInit(): void {
    if (this.config.get('VERIFY_LIVE_CRON', 'true') === 'false') return;

    const intervalMs = Number(this.config.get('VERIFY_LIVE_INTERVAL_MS', '600000'));
    this.logger.log(`Live verification cron every ${intervalMs}ms`);

    const kickoffMs = Number(this.config.get('VERIFY_LIVE_START_DELAY_MS', '15000'));
    this.timeout = setTimeout(() => {
      void this.tick();
      this.interval = setInterval(() => void this.tick(), intervalMs);
    }, kickoffMs);
  }

  onModuleDestroy(): void {
    if (this.timeout) clearTimeout(this.timeout);
    if (this.interval) clearInterval(this.interval);
    this.timeout = null;
    this.interval = null;
  }

  private async tick(): Promise<void> {
    try {
      await this.verification.listCatalog({ limit: 1 });
      await this.verification.runLivePass();
    } catch (error) {
      this.logger.warn(`Live verification cron failed: ${(error as Error).message}`);
    }
  }
}

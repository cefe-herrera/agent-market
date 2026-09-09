import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceV1Controller } from './marketplace-v1.controller';
import { AgentCardPreviewService } from './agent-card-preview.service';
import { AgentsModule } from '../agents/agents.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [AgentsModule, AnalyticsModule, BlockchainModule],
  controllers: [MarketplaceController, MarketplaceV1Controller],
  providers: [MarketplaceService, AgentCardPreviewService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}

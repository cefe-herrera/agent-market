import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { AgentsModule } from '../agents/agents.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [AgentsModule, AnalyticsModule, BlockchainModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}

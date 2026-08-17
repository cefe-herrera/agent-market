import { Module } from '@nestjs/common';
import { AnalyticsService, AnalyticsPublicService } from './analytics-public.service';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [BlockchainModule],
  providers: [AnalyticsService, AnalyticsPublicService],
  exports: [AnalyticsService, AnalyticsPublicService],
})
export class AnalyticsModule {}

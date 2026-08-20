import { Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { AgentsStudioController } from './agents-studio.controller';
import { AgentDiscoveryService } from './agent-discovery.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SecurityModule } from '../security/security.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { EventsModule } from '../../common/events/events.module';

@Module({
  imports: [AnalyticsModule, SecurityModule, BlockchainModule, EventsModule],
  controllers: [AgentsStudioController, AgentsController],
  providers: [AgentsService, AgentDiscoveryService],
  exports: [AgentsService, AgentDiscoveryService],
})
export class AgentsModule {}

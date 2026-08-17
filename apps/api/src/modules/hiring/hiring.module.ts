import { Module } from '@nestjs/common';
import { HiringService } from './hiring.service';
import { HiringController } from './hiring.controller';
import { AgentsModule } from '../agents/agents.module';
import { EventsModule } from '../../common/events/events.module';
import { AGENT_HIRING_PROVIDER } from './interfaces/agent-hiring.provider';
import { MockAgentHiringProvider } from './providers/mock-agent-hiring.provider';

@Module({
  imports: [AgentsModule, EventsModule],
  controllers: [HiringController],
  providers: [
    HiringService,
    MockAgentHiringProvider,
    {
      provide: AGENT_HIRING_PROVIDER,
      useExisting: MockAgentHiringProvider,
    },
  ],
  exports: [HiringService],
})
export class HiringModule {}

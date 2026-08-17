import { Global, Module } from '@nestjs/common';
import { AgentLookupService } from './agent-lookup.service';

@Global()
@Module({
  providers: [AgentLookupService],
  exports: [AgentLookupService],
})
export class AgentLookupModule {}

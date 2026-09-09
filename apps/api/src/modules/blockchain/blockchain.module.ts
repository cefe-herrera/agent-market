import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AGENT_REGISTRY_PROVIDER } from './interfaces/agent-registry.provider';
import { MockAgentRegistryProvider } from './providers/mock-agent-registry.provider';
import { Erc8004RegistryProvider } from './providers/erc8004-registry.provider';
import { Erc8004AgentResolver } from './erc8004/erc8004-agent.resolver';
import { A2aHealthClient } from './erc8004/a2a-health.client';
import { IndexerBnbClient } from './indexer-bnb/indexer-bnb.client';
import { IndexerBnbService } from './indexer-bnb/indexer-bnb.service';
import { NetworkModule } from '../../common/network/network.module';

@Module({
  imports: [ConfigModule, NetworkModule],
  providers: [
    IndexerBnbClient,
    IndexerBnbService,
    Erc8004AgentResolver,
    A2aHealthClient,
    MockAgentRegistryProvider,
    Erc8004RegistryProvider,
    {
      provide: AGENT_REGISTRY_PROVIDER,
      useFactory: (
        config: ConfigService,
        mock: MockAgentRegistryProvider,
        erc8004: Erc8004RegistryProvider,
      ) => {
        const mode = config.get<string>('AGENT_REGISTRY_MODE', 'erc8004');
        return mode === 'mock' ? mock : erc8004;
      },
      inject: [ConfigService, MockAgentRegistryProvider, Erc8004RegistryProvider],
    },
  ],
  exports: [
    AGENT_REGISTRY_PROVIDER,
    MockAgentRegistryProvider,
    Erc8004RegistryProvider,
    IndexerBnbService,
    IndexerBnbClient,
    Erc8004AgentResolver,
    A2aHealthClient,
  ],
})
export class BlockchainModule {}

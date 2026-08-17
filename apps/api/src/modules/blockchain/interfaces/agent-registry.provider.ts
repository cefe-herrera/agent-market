import { ExternalAgent } from '@bnb-marketplace/shared-types';

export interface AgentRegistryProvider {
  getAgents(): Promise<ExternalAgent[]>;
  getAgent(agentId: string): Promise<ExternalAgent>;
  verifyOwnership(agentId: string, wallet: string): Promise<boolean>;
}

export const AGENT_REGISTRY_PROVIDER = 'AGENT_REGISTRY_PROVIDER';

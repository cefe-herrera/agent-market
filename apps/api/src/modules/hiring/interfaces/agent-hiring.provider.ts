import { HireStatus } from '@bnb-marketplace/shared-types';

export interface HireAgentParams {
  agentId: string;
  userWallet: string;
  amount: number;
  asset: string;
}

export interface HireStatusResult {
  hireId: string;
  status: HireStatus;
  activatedAt?: string;
}

export interface AgentHiringProvider {
  hireAgent(params: HireAgentParams): Promise<HireStatusResult>;
  revokeAgent(hireId: string): Promise<HireStatusResult>;
  getHireStatus(hireId: string): Promise<HireStatusResult>;
}

export const AGENT_HIRING_PROVIDER = 'AGENT_HIRING_PROVIDER';

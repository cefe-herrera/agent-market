import { Injectable } from '@nestjs/common';
import { HireStatus } from '@bnb-marketplace/shared-types';
import {
  AgentHiringProvider,
  HireAgentParams,
  HireStatusResult,
} from '../interfaces/agent-hiring.provider';

@Injectable()
export class MockAgentHiringProvider implements AgentHiringProvider {
  private readonly statuses = new Map<string, HireStatusResult>();

  async hireAgent(params: HireAgentParams): Promise<HireStatusResult> {
    const hireId = `mock-hire-${Date.now()}`;
    const result: HireStatusResult = {
      hireId,
      status: HireStatus.ACTIVE,
      activatedAt: new Date().toISOString(),
    };
    this.statuses.set(hireId, result);
    return result;
  }

  async revokeAgent(hireId: string): Promise<HireStatusResult> {
    const result: HireStatusResult = {
      hireId,
      status: HireStatus.REVOKED,
    };
    this.statuses.set(hireId, result);
    return result;
  }

  async getHireStatus(hireId: string): Promise<HireStatusResult> {
    const status = this.statuses.get(hireId);
    if (!status) {
      return { hireId, status: HireStatus.PENDING };
    }
    return status;
  }
}

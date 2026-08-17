import { MockAgentRegistryProvider } from '../src/modules/blockchain/providers/mock-agent-registry.provider';

describe('MockAgentRegistryProvider', () => {
  let provider: MockAgentRegistryProvider;

  beforeEach(() => {
    provider = new MockAgentRegistryProvider();
  });

  it('should return mock agents', async () => {
    const agents = await provider.getAgents();
    expect(agents.length).toBe(4);
    expect(agents[0].network).toBe('BNB Chain');
  });

  it('should get agent by id', async () => {
    const agent = await provider.getAgent('erc8004-1001');
    expect(agent.name).toBe('YieldRouter Studio');
  });

  it('should verify ownership', async () => {
    const result = await provider.verifyOwnership('erc8004-1001', '0xStudioOwner1001a1b2c3d4e5f6789012345678901234');
    expect(result).toBe(true);
  });

  it('should reject wrong owner', async () => {
    const result = await provider.verifyOwnership('erc8004-1001', '0xWrong');
    expect(result).toBe(false);
  });
});

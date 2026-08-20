import { isAgentCardPayload, parseAgentCard } from '../src/modules/blockchain/erc8004/a2a-health';

describe('A2A agent-card parse', () => {
  it('extracts skills and x402Support from an A2A card', () => {
    const parsed = parseAgentCard({
      name: 'studio-agent',
      description: 'bnbagent-studio agent',
      x402Support: true,
      skills: [{ id: 'chat', name: 'chat' }, { name: 'forecast' }],
    });

    expect(parsed.name).toBe('studio-agent');
    expect(parsed.x402Support).toBe(true);
    expect(parsed.skills).toEqual(['chat', 'forecast']);
  });

  it('rejects empty payloads as not a card', () => {
    expect(isAgentCardPayload({})).toBe(false);
    expect(isAgentCardPayload({ name: 'ok' })).toBe(true);
  });
});

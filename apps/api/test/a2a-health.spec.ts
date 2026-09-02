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

  it('reads declared usage price from A2A services', () => {
    const parsed = parseAgentCard({
      name: 'Brain on BNB',
      skills: ['list'],
      services: [
        { id: 'health_factor', price_display: '0.10 $U' },
        { id: 'grid_plan', price_display: '0.10 $U' },
      ],
    });
    expect(parsed.priceLabel).toBe('0.10 $U');
  });

  it('rejects empty payloads as not a card', () => {
    expect(isAgentCardPayload({})).toBe(false);
    expect(isAgentCardPayload({ name: 'ok' })).toBe(true);
  });
});

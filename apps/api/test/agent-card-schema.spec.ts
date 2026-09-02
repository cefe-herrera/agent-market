import {
  evaluateLiveProbe,
  isCoherentLiveResponse,
  validateAgentCard,
} from '../src/modules/blockchain/erc8004/agent-card-schema';

const brainCard = {
  name: 'Brain on BNB — Venus Health Factor Monitor',
  description: 'Reads a Venus lending position',
  url: 'https://agent.brainonbnb.com/a2a',
  skills: ['list', 'negotiate'],
  services: [
    { id: 'health_factor', price_display: '0.10 $U', price: '100000000000000000' },
  ],
};

describe('agent-card-schema', () => {
  it('accepts an A2A card with endpoint, skills and declared pricing', () => {
    const result = validateAgentCard(brainCard, brainCard.url);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.card.priceLabel).toBe('0.10 $U');
  });

  it('accepts BNB Agent SDK cards that declare x402 or a quote skill', () => {
    const bort = validateAgentCard({
      name: 'BORT Agent',
      url: 'https://api.bortagent.xyz/api/a2a',
      capabilities: { x402: true },
      skills: [{ id: 'paid-inference', name: 'Pay-per-call LLM inference', tags: ['x402'] }],
    });
    expect(bort.valid).toBe(true);

    const mandate = validateAgentCard({
      name: 'mandaterebalance-agent',
      url: 'https://example.com/a2a',
      capabilities: { streaming: false },
      skills: [{ id: 'negotiate', name: 'Quote a rebalance' }],
    });
    expect(mandate.valid).toBe(true);
  });

  it('rejects identity-only payloads without endpoint, skills or pricing', () => {
    const result = validateAgentCard({ name: 'Agent #1' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('missing endpoint url');
    expect(result.errors).toContain('missing capabilities/skills');
    expect(result.errors).toContain('missing declared pricing');
  });

  it('allows open-catalog cards with endpoint and skills but no pricing', () => {
    const result = validateAgentCard(
      {
        name: 'A2A Live Test Agent',
        url: 'https://example.com/.well-known/agent-card.json',
        skills: [{ id: 'echo', name: 'Echo' }],
      },
      null,
      { requirePricing: false },
    );
    expect(result.valid).toBe(true);
  });

  it('treats a matching live Agent Card as coherent, not just HTTP 200', () => {
    const declared = validateAgentCard(brainCard, brainCard.url).card;
    expect(isCoherentLiveResponse(brainCard, declared).ok).toBe(true);
    expect(
      isCoherentLiveResponse({ ok: true, ping: 'pong' }, declared).ok,
    ).toBe(false);
  });

  it('treats A2A JSON-RPC and declared auth/x402 HTTP codes as live, not GET 404', () => {
    const declared = validateAgentCard(brainCard, brainCard.url).card;
    expect(
      isCoherentLiveResponse(
        { jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'unsupported method' } },
        declared,
      ).ok,
    ).toBe(true);

    const oauth = validateAgentCard({
      ...brainCard,
      securitySchemes: { oauth2: { type: 'oauth2' } },
    }).card;
    expect(evaluateLiveProbe({ status: 401, json: { message: 'Unauthorized' }, declared: oauth }).ok).toBe(
      true,
    );

    const x402 = validateAgentCard({
      name: 'BORT Agent',
      url: 'https://api.bortagent.xyz/api/a2a',
      capabilities: { x402: true },
      skills: [{ id: 'paid-inference', tags: ['x402'] }],
    }).card;
    expect(evaluateLiveProbe({ status: 402, json: { error: 'Payment Required' }, declared: x402 }).ok).toBe(
      true,
    );

    expect(
      evaluateLiveProbe({ status: 404, json: { message: 'Not Found' }, declared }).ok,
    ).toBe(false);
  });
});

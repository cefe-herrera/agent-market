import {
  isFactoryNoise,
  isLikelyActiveScanItem,
  mergeDetailIntoListItem,
  scanItemNeedsDetail,
} from '../src/modules/blockchain/erc8004/erc8004-list-quality';
import type { Scan8004ListItem } from '../src/modules/blockchain/erc8004/erc8004.types';

function item(overrides: Partial<Scan8004ListItem> = {}): Scan8004ListItem {
  return {
    token_id: '1',
    chain_id: 8453,
    name: 'Useful Agent',
    description: 'A real product description that explains what the agent does for callers in production.',
    owner_address: '0x1',
    created_at: '2026-01-01T00:00:00.000Z',
    agent_id: '8453:0x8004:1',
    ...overrides,
  };
}

describe('erc8004-list-quality', () => {
  it('drops Termix factory registrations', () => {
    expect(
      isFactoryNoise(
        item({
          name: 'HyperGoldMesh.agent',
          description: 'HyperGoldMesh.agent on Termix Platform',
          supported_protocols: ['A2A'],
        }),
      ),
    ).toBe(true);
    expect(isLikelyActiveScanItem(item({
      name: 'HyperGoldMesh.agent',
      description: 'HyperGoldMesh.agent on Termix Platform',
      supported_protocols: ['A2A'],
    }))).toBe(false);
  });

  it('drops empty Agent #token identities', () => {
    expect(
      isFactoryNoise(item({ name: 'Agent #73353', description: null })),
    ).toBe(true);
  });

  it('keeps agents with feedback, x402, or MCP', () => {
    expect(isLikelyActiveScanItem(item({ total_feedbacks: 1 }))).toBe(true);
    expect(
      isLikelyActiveScanItem(
        item({
          description: 'Pays per call.',
          x402_supported: true,
        }),
      ),
    ).toBe(true);
    expect(
      isLikelyActiveScanItem(
        item({
          description: 'Tools.',
          supported_protocols: ['MCP'],
        }),
      ),
    ).toBe(true);
  });

  it('keeps long real descriptions even without scores', () => {
    expect(
      isLikelyActiveScanItem(
        item({
          total_feedbacks: 0,
          x402_supported: false,
          supported_protocols: ['A2A', 'Web'],
        }),
      ),
    ).toBe(true);
  });

  it('needs detail only when A2A or MCP is declared without endpoints', () => {
    expect(scanItemNeedsDetail(item({ supported_protocols: [] }))).toBe(false);
    expect(scanItemNeedsDetail(item({ supported_protocols: ['A2A'] }))).toBe(true);
    expect(scanItemNeedsDetail(item({ supported_protocols: ['MCP'] }))).toBe(true);
    expect(
      scanItemNeedsDetail(
        item({
          supported_protocols: ['A2A'],
          a2a_endpoint: 'https://example.com/.well-known/agent-card.json',
        }),
      ),
    ).toBe(false);
  });

  it('merges 8004scan detail endpoints and health into list items', () => {
    const merged = mergeDetailIntoListItem(item({ supported_protocols: ['A2A'] }), {
      agent_id: '8453:0x8004:1',
      token_id: '1',
      chain_id: 8453,
      name: 'Useful Agent',
      description: 'A real product description that explains what the agent does for callers in production.',
      owner_address: '0x1',
      agent_wallet: '0x1',
      image_url: null,
      created_at: '2026-01-01T00:00:00.000Z',
      supported_protocols: ['A2A'],
      is_verified: false,
      is_active: true,
      star_count: 0,
      watch_count: 0,
      x402_supported: false,
      health_score: 50,
      total_score: 0,
      total_feedbacks: 1,
      total_validations: 0,
      successful_validations: 0,
      average_score: 0,
      rank: null,
      a2a_endpoint: 'https://magnetite.eth/.well-known/agent-card.json',
      mcp_server: null,
      health_status: {
        services: { a2a: { status: 'unhealthy', message: 'DNS error' } },
        checked_at: '2026-08-28T10:36:27Z',
      },
    });

    expect(merged.a2a_endpoint).toContain('agent-card.json');
    expect(merged.health_status?.services?.a2a?.status).toBe('unhealthy');
  });
});

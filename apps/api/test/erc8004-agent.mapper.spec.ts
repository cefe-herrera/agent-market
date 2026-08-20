import {
  inferAgentCategory,
  isBnbAgentStudioAgent,
  decodeHexMetadata,
  mapScanDetailToMarketplaceAgent,
} from '../src/modules/blockchain/erc8004/erc8004-agent.mapper';
import { AgentCategory, AgentSource } from '@bnb-marketplace/shared-types';

describe('erc8004-agent.mapper', () => {
  it('decodes hex built_with metadata', () => {
    const decoded = decodeHexMetadata(
      '0x68747470733a2f2f6769746875622e636f6d2f626e622d636861696e2f626e626167656e742d73646b2376302e342e32',
    );
    expect(decoded).toContain('bnb-chain/bnbagent-sdk');
  });

  it('detects BNB Agent Studio agents via built_with metadata', () => {
    const detail = {
      agent_id: '97:0xabc:1',
      token_id: '1',
      chain_id: 97,
      name: 'Test Agent',
      description: 'Test',
      owner_address: '0x1',
      agent_wallet: '0x2',
      image_url: null,
      created_at: '2026-01-01T00:00:00.000Z',
      supported_protocols: [],
      is_verified: false,
      is_active: true,
      star_count: 0,
      watch_count: 0,
      total_validations: 0,
      successful_validations: 0,
      total_feedbacks: 0,
      health_score: 0,
      total_score: 0,
      average_score: 0,
      rank: 0,
      x402_supported: false,
      raw_metadata: {
        onchain: [
          {
            key: 'built_with',
            value:
              '0x68747470733a2f2f6769746875622e636f6d2f626e622d636861696e2f626e626167656e742d73646b2376302e342e32',
            decoded: null,
          },
        ],
      },
    };

    expect(isBnbAgentStudioAgent(detail, 'bnb-chain/bnbagent-sdk')).toBe(true);
    expect(isBnbAgentStudioAgent(detail, 'other-sdk')).toBe(false);
  });

  it('infers health factor category from agent copy', () => {
    expect(
      inferAgentCategory(
        'ProofEra Health-Factor Guardian',
        'Venus health factor monitoring',
      ),
    ).toBe(AgentCategory.HEALTH_FACTOR_MONITORING);
  });

  it('maps 8004scan agent detail to marketplace dto', () => {
    const detail = {
      id: '1463fd3b-6227-4fe9-9fb7-65b38067b888',
      agent_id: '56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:269020',
      token_id: '269020',
      chain_id: 56,
      name: 'Ave.ai Trading Agent',
      description: 'AI-driven multi-chain trading agent with on-chain reputation.',
      owner_address: '0xc716e7002334a72476c3a218cb4e749a5a9a5e7a',
      agent_wallet: '0xc716e7002334a72476c3a218cb4e749a5a9a5e7a',
      image_url: 'https://example.com/logo.png',
      created_at: '2026-08-17T12:21:16Z',
      updated_at: '2026-08-17T12:21:52.008167Z',
      supported_protocols: [],
      is_verified: false,
      is_active: true,
      star_count: 2,
      watch_count: 1,
      total_validations: 10,
      successful_validations: 8,
      total_feedbacks: 3,
      health_score: 85,
      total_score: 42,
      average_score: 4.2,
      rank: 12,
      x402_supported: true,
      a2a_endpoint: 'https://example.com/.well-known/agent-card.json',
      health_status: {
        services: {
          a2a: { status: 'unhealthy', latency_ms: 6006, message: 'Timed out after 6s' },
        },
        checked_at: '2026-08-20T07:55:17.033561+00:00',
      },
      raw_metadata: {
        offchain_uri: 'erc8004://56/269020',
      },
    };

    const dto = mapScanDetailToMarketplaceAgent(detail, {
      chainId: 56,
      name: 'BNB Chain',
      chainKey: 'bsc_mainnet',
      isTestnet: false,
    });

    expect(dto.source).toBe(AgentSource.ERC8004);
    expect(dto.agentWallet).toBe('0xc716e7002334a72476c3a218cb4e749a5a9a5e7a');
    expect(dto.metrics?.totalExecutions).toBe(10);
    expect(dto.metrics?.successfulExecutions).toBe(8);
    expect(dto.metrics?.successRate).toBe(80);
    expect(dto.metrics?.categoryMetrics['healthScore']).toBe(85);
    expect(dto.a2a?.healthy).toBe(false);
    expect(dto.a2a?.status).toBe('unhealthy');
    expect(dto.a2a?.endpoint).toContain('agent-card.json');
    expect(dto.supportedAssets).toEqual(['U']);
  });
});

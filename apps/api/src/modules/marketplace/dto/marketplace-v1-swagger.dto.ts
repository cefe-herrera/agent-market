import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 'Indexer unavailable: Indexer HTTP 502' })
  error!: string;

  @ApiPropertyOptional({
    example: { upstream: 'indexer-bnb', status: 502 },
  })
  details?: unknown;
}

export class MarketplaceV1ListResponseDto {
  @ApiProperty({
    type: 'array',
    description: 'Marketplace agents list. Shape matches MarketplaceAgentDto.',
    example: [
      {
        id: 'f81f5f4e-bf09-457f-a86f-b090ac9056f9',
        agentId: '97:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:417',
        name: 'Latam FX Desk',
        slug: 'latam-fx-desk-417',
        description: 'A2A quote endpoint',
        shortDescription: 'A2A quote endpoint',
        ownerWallet: '0xa457dd1a8d9e243f229eb919d7a08b43802aed8b',
        agentWallet: '0xa457dd1a8d9e243f229eb919d7a08b43802aed8b',
        agentUri: 'https://example.org/.well-known/agent-card.json',
        network: 'BSC Testnet',
        chainId: 97,
        isTestnet: true,
        protocols: ['ERC-8004', 'A2A'],
        supportedAssets: ['U'],
        verified: false,
      },
    ],
  })
  data!: unknown[];

  @ApiProperty({ example: 24 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 100 })
  limit!: number;
}

export class MarketplaceStatsResponseDto {
  @ApiProperty({ example: 24 })
  agents!: number;

  @ApiProperty({ example: 4 })
  categories!: number;

  @ApiProperty({ example: 2 })
  protocols!: number;

  @ApiProperty({ example: 12 })
  verified!: number;

  @ApiProperty({ example: 0 })
  studioAgents!: number;

  @ApiProperty({ example: 1 })
  chains!: number;

  @ApiProperty({ example: 0 })
  mainnetAgents!: number;

  @ApiProperty({ example: 24 })
  testnetAgents!: number;
}

export class A2aHealthResponseDto {
  @ApiPropertyOptional({ example: 'https://example.org/.well-known/agent-card.json' })
  endpoint!: string | null;

  @ApiProperty({ example: true })
  healthy!: boolean;

  @ApiProperty({
    example: 'healthy',
    enum: ['healthy', 'unhealthy', 'unknown', 'missing'],
  })
  status!: 'healthy' | 'unhealthy' | 'unknown' | 'missing';

  @ApiPropertyOptional({ example: 142 })
  latencyMs!: number | null;

  @ApiProperty({ example: '2026-09-09T02:20:00.000Z' })
  checkedAt!: string;

  @ApiPropertyOptional({ example: null })
  error!: string | null;

  @ApiProperty({ type: [String], example: ['quote', 'fx', 'latam'] })
  skills!: string[];

  @ApiPropertyOptional({ example: true })
  x402Support!: boolean | null;

  @ApiPropertyOptional({ example: 'x402 $U' })
  priceLabel?: string | null;
}

export class AgentCardPreviewResponseDto {
  @ApiProperty({ example: 'https://example.org/.well-known/agent-card.json' })
  sourceUrl!: string;

  @ApiPropertyOptional({ example: 'Latam FX Desk' })
  name!: string | null;

  @ApiPropertyOptional({ example: 'A2A quote endpoint' })
  description!: string | null;

  @ApiPropertyOptional({ example: 'https://example.org/a2a' })
  endpoint!: string | null;

  @ApiPropertyOptional({ example: 'Latam Market' })
  provider!: string | null;

  @ApiPropertyOptional({ example: 'https://docs.example.org' })
  documentationUrl!: string | null;

  @ApiProperty({ example: true })
  x402!: boolean;

  @ApiPropertyOptional({ example: '2.0' })
  protocolVersion!: string | null;

  @ApiPropertyOptional({ example: 'http' })
  preferredTransport!: string | null;

  @ApiProperty({
    type: 'array',
    example: [{ id: 'fx_quote', name: 'FX Quote', description: 'Returns FX quote', tags: ['fx'] }],
  })
  skills!: unknown[];

  @ApiProperty({
    type: 'array',
    example: [{ transport: 'http', url: 'https://example.org/a2a' }],
  })
  interfaces!: Array<{ transport: string | null; url: string }>;

  @ApiProperty({
    description: 'Raw card JSON returned by provider.',
    example: { name: 'Latam FX Desk', url: 'https://example.org/a2a' },
  })
  card!: Record<string, unknown>;
}

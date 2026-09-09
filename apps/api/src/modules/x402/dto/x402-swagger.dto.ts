import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class X402SettleRequestDto {
  @ApiProperty({
    description: 'x402 payment envelope (passed through to facilitator).',
    example: {
      x402Version: 2,
      paymentRequirements: {
        scheme: 'exact',
        network: 'eip155:97',
        amount: '1000000000000000',
        asset: '0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565',
        payTo: '0xA457Dd1a8D9E243f229EB919d7a08b43802aeD8b',
      },
      paymentPayload: {
        accepted: {
          scheme: 'exact',
          network: 'eip155:97',
          amount: '1000000000000000',
          asset: '0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565',
          payTo: '0xA457Dd1a8D9E243f229EB919d7a08b43802aeD8b',
        },
      },
    },
  })
  payload!: Record<string, unknown>;
}

export class X402SettleResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiPropertyOptional({ example: '0xabc123' })
  transaction!: string | null;

  @ApiPropertyOptional({ example: '0xpayer123' })
  payer!: string | null;

  @ApiProperty({ example: 'eip155:97' })
  network!: string;
}

export class X402ErrorResponseDto {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty({ example: 'x402 verify failed' })
  error!: string;

  @ApiPropertyOptional({
    example: { invalidReason: 'PAYMENT_SIGNATURE_INVALID' },
  })
  details?: unknown;
}

export class PaymentRequiredResponseDto {
  @ApiProperty({ example: 2 })
  x402Version!: number;

  @ApiProperty({
    example: 'PAYMENT-SIGNATURE required - exact $U EIP-3009 on eip155:97',
  })
  error!: string;

  @ApiProperty({
    example: {
      url: 'http://localhost:3000/api/v1/agent/resource?seller=demo:fx-desk',
      description: 'Latam FX Desk - x402 seller (eip155:97 $U)',
      mimeType: 'application/json',
      serviceName: 'demo:fx-desk',
      tags: ['x402', 'erc8004', 'bnb'],
    },
  })
  resource!: Record<string, unknown>;

  @ApiProperty({
    type: 'array',
    example: [
      {
        scheme: 'exact',
        network: 'eip155:97',
        amount: '1000000000000000',
        asset: '0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565',
        payTo: '0xA457Dd1a8D9E243f229EB919d7a08b43802aeD8b',
        maxTimeoutSeconds: 3600,
      },
    ],
  })
  accepts!: unknown[];
}

export class AgentResourceResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiPropertyOptional({ example: '0xabc123' })
  transaction!: string | null;

  @ApiPropertyOptional({ example: '0xpayer123' })
  payer!: string | null;

  @ApiProperty({ example: 'eip155:97' })
  network!: string;

  @ApiProperty({ example: '97:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:417' })
  agentId!: string;

  @ApiProperty({
    example: {
      agent: 'Latam FX Desk',
      kind: 'demo:fx-desk',
      source: 'demo seller - frozen JSON',
      json: { service: 'fx-desk', version: 1 },
      receipt: {
        paid: '0.001',
        asset: 'U',
        network: 'eip155:97',
        payer: '0xpayer123',
        payTo: '0xA457Dd1a8D9E243f229EB919d7a08b43802aeD8b',
        tx: '0xabc123',
      },
    },
  })
  work!: Record<string, unknown>;
}

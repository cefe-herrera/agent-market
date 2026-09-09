import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { X402Service } from '../src/modules/x402/x402.service';
import { FacilitatorClient } from '../src/modules/x402/facilitator.client';
import { AgentsService } from '../src/modules/agents/agents.service';
import { NetworkConfig } from '../src/common/network/network.config';

describe('X402Service', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        X402_PAY_TO: '0xA457Dd1a8D9E243f229EB919d7a08b43802aeD8b',
        U_TOKEN_TESTNET: '0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565',
      };
      return values[key];
    }),
  } as unknown as ConfigService;

  const network = { chainId: 97 } as NetworkConfig;

  const facilitator = {
    verify: jest.fn(),
    settle: jest.fn(),
  } as unknown as jest.Mocked<FacilitatorClient>;

  const agents = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<AgentsService>;

  let service: X402Service;

  beforeEach(() => {
    facilitator.verify = jest.fn();
    facilitator.settle = jest.fn();
    agents.findById = jest.fn();
    service = new X402Service(config, network, facilitator, agents);
  });

  it('returns payment-required contract', () => {
    const payload = service.paymentRequired('http://localhost:3000/api/v1/agent/resource');
    expect(payload.x402Version).toBe(2);
    expect(payload.accepts[0].network).toBe('eip155:97');
    expect(payload.accepts[0].amount).toBe('1000000000000000');
  });

  it('throws on verify failure during settle', async () => {
    facilitator.verify.mockResolvedValue({
      ok: false,
      status: 400,
      json: { error: 'bad signature' },
      text: '',
    });

    let error: unknown;
    try {
      await service.settle({});
    } catch (caught) {
      error = caught;
    }
    expect(error instanceof HttpException).toBe(true);
  });

  it('throws on settle failure during settle flow', async () => {
    facilitator.verify.mockResolvedValue({
      ok: true,
      status: 200,
      json: { isValid: true, payer: '0xpayer' },
      text: '',
    });
    facilitator.settle.mockResolvedValue({
      ok: false,
      status: 400,
      json: { error: 'settle failed' },
      text: '',
    });

    let error: unknown;
    try {
      await service.settle({});
    } catch (caught) {
      error = caught;
    }
    expect(error instanceof HttpException).toBe(true);
  });

  it('returns transaction on successful settle flow', async () => {
    facilitator.verify.mockResolvedValue({
      ok: true,
      status: 200,
      json: { isValid: true, payer: '0xpayer' },
      text: '',
    });
    facilitator.settle.mockResolvedValue({
      ok: true,
      status: 200,
      json: { success: true, transaction: '0xtx', network: 'eip155:97' },
      text: '',
    });

    const result = await service.settle({});
    expect(result.success).toBe(true);
    expect(result.transaction).toBe('0xtx');
    expect(result.payer).toBe('0xpayer');
    expect(result.network).toBe('eip155:97');
  });
});

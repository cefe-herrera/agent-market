import { HttpException } from '@nestjs/common';
import { X402Controller } from '../src/modules/x402/x402.controller';
import { X402Service } from '../src/modules/x402/x402.service';

describe('X402Controller', () => {
  let controller: X402Controller;
  let service: jest.Mocked<X402Service>;

  beforeEach(() => {
    service = {
      settle: jest.fn(),
      paymentRequired: jest.fn(),
      executePaidResource: jest.fn(),
    } as unknown as jest.Mocked<X402Service>;
    controller = new X402Controller(service);
  });

  it('throws when x-agent-id header is missing', async () => {
    expect(() => controller.paidResource({}, undefined, undefined)).toThrow(HttpException);
  });

  it('delegates settle endpoint', async () => {
    service.settle.mockResolvedValue({
      success: true,
      transaction: null,
      payer: null,
      network: 'eip155:97',
    });
    const result = await controller.settle({ payment: true });
    expect(result.success).toBe(true);
    expect(service.settle).toHaveBeenCalledWith({ payment: true });
  });
});

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiPaymentRequiredResponse,
  ApiQuery,
  ApiTags,
  ApiOkResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { X402Service } from './x402.service';
import {
  AgentResourceResponseDto,
  PaymentRequiredResponseDto,
  X402ErrorResponseDto,
  X402SettleResponseDto,
} from './dto/x402-swagger.dto';

@ApiTags('x402-v1')
@Controller('api/v1')
export class X402Controller {
  constructor(private readonly x402: X402Service) {}

  @Post('x402/settle')
  @ApiOperation({ summary: 'Verify and settle x402 payment through facilitator (v1)' })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: true,
      example: {
        x402Version: 2,
        paymentRequirements: {
          scheme: 'exact',
          network: 'eip155:97',
          amount: '1000000000000000',
          asset: '0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565',
          payTo: '0xA457Dd1a8D9E243f229EB919d7a08b43802aeD8b',
        },
      },
    },
  })
  @ApiOkResponse({ type: X402SettleResponseDto })
  @ApiBadRequestResponse({ type: X402ErrorResponseDto })
  settle(@Body() body: unknown) {
    return this.x402.settle(body);
  }

  @Get('agent/resource')
  @HttpCode(402)
  @ApiOperation({ summary: 'Return x402 PaymentRequired contract (v1)' })
  @ApiQuery({
    name: 'seller',
    required: false,
    example: 'demo:fx-desk',
    description: 'Optional seller/agent id used to customize payment metadata',
  })
  @ApiPaymentRequiredResponse({ type: PaymentRequiredResponseDto })
  paymentRequired(@Req() request: Request) {
    const fullUrl = `${request.protocol}://${request.get('host')}${request.originalUrl}`;
    const seller = typeof request.query.seller === 'string' ? request.query.seller : null;
    const payload = this.x402.paymentRequired(fullUrl, seller);
    throw new HttpException(payload, 402);
  }

  @Post('agent/resource')
  @ApiOperation({ summary: 'Verify/settle and return paid agent resource (v1)' })
  @ApiHeader({
    name: 'x-agent-id',
    required: true,
    description: 'Selected agent id from catalog',
    example: '97:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:417',
  })
  @ApiHeader({
    name: 'x-agent-name',
    required: false,
    description: 'Optional agent display name',
    example: 'Latam FX Desk',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: true,
      example: {
        x402Version: 2,
        paymentRequirements: {
          scheme: 'exact',
          network: 'eip155:97',
          amount: '1000000000000000',
          asset: '0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565',
          payTo: '0xA457Dd1a8D9E243f229EB919d7a08b43802aeD8b',
        },
      },
    },
  })
  @ApiOkResponse({ type: AgentResourceResponseDto })
  @ApiBadRequestResponse({ type: X402ErrorResponseDto })
  @ApiPaymentRequiredResponse({ type: X402ErrorResponseDto })
  paidResource(
    @Body() body: unknown,
    @Headers('x-agent-id') agentId: string | undefined,
    @Headers('x-agent-name') agentName: string | undefined,
  ) {
    if (!agentId) {
      throw new HttpException(
        { success: false, error: 'Elegi un agente del catalogo (demo o indexador).' },
        400,
      );
    }
    return this.x402.executePaidResource({ agentId, agentName, body });
  }
}

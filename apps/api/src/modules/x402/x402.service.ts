import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NetworkConfig } from '../../common/network/network.config';
import { AgentsService } from '../agents/agents.service';
import { FacilitatorClient } from './facilitator.client';
import type {
  AgentWork,
  DemoSeller,
  FacilitatorErrorBody,
  FacilitatorResponse,
} from './x402.types';

const FALLBACK_U_TESTNET = '0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565';
const FALLBACK_U_MAINNET = '0xcE24439F2D9C6a2289F741120FE202248B666666';
const FALLBACK_PAY_TO = '0xA457Dd1a8D9E243f229EB919d7a08b43802aeD8b';
const X402_MAX_TIMEOUT_SECONDS = 3600;
const X402_PAYMENT_AMOUNT = '0.001';
const X402_AMOUNT_ATOMIC = '1000000000000000';

const DEMO_SELLERS: DemoSeller[] = [
  {
    agentId: 'demo:fx-desk',
    name: 'Latam FX Desk',
    shortDescription: 'Cotizacion USD -> ARS / BRL / COP. JSON fijo.',
    description:
      'Devuelve un book de FX Latam. El cuerpo no cambia entre pagos; el receipt x402 va aparte.',
    json: {
      service: 'fx-desk',
      version: 1,
      base: 'USD',
      quotes: [
        { pair: 'USDARS', rate: '1425.50', side: 'sell' },
        { pair: 'USDBRL', rate: '5.42', side: 'sell' },
        { pair: 'USDCOP', rate: '4120.00', side: 'sell' },
      ],
      validForSeconds: 60,
    },
  },
  {
    agentId: 'demo:token-screener',
    name: 'BNB Token Screener',
    shortDescription: 'Screen de liquidez/riesgo BNB. Snapshot fijo.',
    description: 'Lista 4 pares BNB con liquidez y risk label. No llama DexScreener.',
    json: {
      service: 'token-screener',
      version: 1,
      chain: 'bsc',
      tokens: [
        { pair: 'WBNB/USDT', liquidityUsd: 12500000, risk: 'low' },
        { pair: 'CAKE/WBNB', liquidityUsd: 4200000, risk: 'low' },
        { pair: 'FIST/WBNB', liquidityUsd: 126405, risk: 'medium' },
        { pair: 'OSK/WBNB', liquidityUsd: 1552, risk: 'high' },
      ],
    },
  },
  {
    agentId: 'demo:wallet-watcher',
    name: 'Wallet Watcher',
    shortDescription: 'Reporte de riesgo de wallet. JSON fijo.',
    description: 'Clasificacion de EOA sin flags. No lee RPC; el pagador va en el receipt.',
    json: {
      service: 'wallet-watcher',
      version: 1,
      chain: 'eip155:97',
      summary: { risk: 'low', label: 'eoa', flags: [] },
    },
  },
  {
    agentId: 'demo:payroll',
    name: 'Latam Payroll',
    shortDescription: 'Quote de nomina US->AR en $U. JSON fijo.',
    description: 'Corredor payroll con fee y ETA. Mismo JSON en cada hire.',
    json: {
      service: 'payroll-corridor',
      version: 1,
      corridor: 'US-AR',
      payout: {
        asset: 'U',
        amount: '100.00',
        fee: '0.80',
        etaHours: 24,
      },
      rails: ['x402', 'eip-3009'],
    },
  },
];

@Injectable()
export class X402Service {
  constructor(
    private readonly config: ConfigService,
    private readonly network: NetworkConfig,
    private readonly facilitator: FacilitatorClient,
    private readonly agentsService: AgentsService,
  ) {}

  paymentRequired(resourceUrl: string, sellerId?: string | null) {
    const demo = this.getDemoSeller(sellerId);
    return {
      x402Version: 2,
      error: `PAYMENT-SIGNATURE required - exact $U EIP-3009 on ${this.x402Network()}`,
      resource: {
        url: resourceUrl,
        description: demo
          ? `${demo.name} - x402 seller (${this.x402Network()} $U)`
          : `Latam Market Pay - x402 seller (${this.x402Network()} $U)`,
        mimeType: 'application/json',
        serviceName: demo?.agentId ?? sellerId ?? 'LatamMarketPay',
        tags: ['x402', 'erc8004', 'bnb'],
      },
      accepts: [this.usdcExactRequirements()],
      extensions: {
        erc8004: {
          info: {
            agentId: sellerId ?? null,
            name: demo?.name ?? null,
          },
          schema: { type: 'object' },
        },
      },
    };
  }

  async settle(body: unknown) {
    const verified = await this.facilitator.verify(body);
    if (!verified.ok) {
      throw new HttpException(
        {
          success: false,
          error: this.facilitatorErrorMessage('/verify', verified),
          details: verified.json ?? verified.text,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const verifyJson = verified.json as { isValid?: boolean; payer?: string };
    if (verifyJson.isValid === false) {
      throw new HttpException(
        {
          success: false,
          error: this.facilitatorErrorMessage('/verify', verified),
          details: verified.json,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const settled = await this.facilitator.settle(body);
    if (!settled.ok) {
      throw new HttpException(
        {
          success: false,
          error: this.facilitatorErrorMessage('/settle', settled),
          details: settled.json ?? settled.text,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const settleJson = settled.json as {
      success?: boolean;
      transaction?: string;
      payer?: string;
      network?: string;
    };
    return {
      success: settleJson.success !== false,
      transaction: settleJson.transaction ?? null,
      payer: settleJson.payer ?? verifyJson.payer ?? null,
      network: settleJson.network ?? this.x402Network(),
    };
  }

  async executePaidResource(opts: {
    agentId: string;
    agentName?: string | null;
    body: unknown;
  }) {
    const expected = this.usdcExactRequirements();
    const sentAsset =
      (opts.body as { paymentRequirements?: { asset?: string } }).paymentRequirements
        ?.asset ??
      (
        opts.body as {
          paymentPayload?: { accepted?: { asset?: string } };
        }
      ).paymentPayload?.accepted?.asset;

    if (
      typeof sentAsset === 'string' &&
      this.normalizeAddress(sentAsset) !== this.normalizeAddress(expected.asset)
    ) {
      throw new HttpException(
        {
          success: false,
          error: `x402 asset mismatch: client sent ${sentAsset} but ${expected.network} $U is ${expected.asset}.`,
          details: { sentAsset, expected: expected.asset, network: expected.network },
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const verified = await this.facilitator.verify(opts.body);
    const verifyJson = verified.json as { isValid?: boolean; payer?: string };
    if (!verified.ok || verifyJson?.isValid === false) {
      throw new HttpException(
        {
          success: false,
          error: 'x402 verify failed',
          details: verified.json ?? verified.text,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const settled = await this.facilitator.settle(opts.body);
    const settleJson = settled.json as {
      success?: boolean;
      transaction?: string;
      payer?: string;
      network?: string;
    };
    if (!settled.ok || settleJson.success === false) {
      throw new HttpException(
        {
          success: false,
          error: 'x402 settle failed',
          details: settled.json ?? settled.text,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const { payer, payTo } = this.paymentAddresses(opts.body);
    const work = await this.resolvePaidWork({
      agentId: opts.agentId,
      agentName: opts.agentName,
      payer: settleJson.payer ?? verifyJson.payer ?? payer,
      payTo,
      settleTx: settleJson.transaction,
    });

    return {
      success: true,
      transaction: settleJson.transaction ?? null,
      payer: settleJson.payer ?? verifyJson.payer ?? payer ?? null,
      network: settleJson.network ?? this.x402Network(),
      agentId: opts.agentId,
      work,
    };
  }

  private x402Network(): 'eip155:56' | 'eip155:97' {
    return this.network.chainId === 56 ? 'eip155:56' : 'eip155:97';
  }

  private x402Token(): string {
    const isMainnet = this.network.chainId === 56;
    if (isMainnet) {
      return (
        this.config.get<string>('U_TOKEN_MAINNET') ??
        this.config.get<string>('NEXT_PUBLIC_U_TOKEN_MAINNET') ??
        FALLBACK_U_MAINNET
      );
    }
    return (
      this.config.get<string>('U_TOKEN_TESTNET') ??
      this.config.get<string>('NEXT_PUBLIC_U_TOKEN_TESTNET') ??
      FALLBACK_U_TESTNET
    );
  }

  private x402PayTo(): string {
    return (
      this.config.get<string>('X402_PAY_TO') ??
      this.config.get<string>('NEXT_PUBLIC_X402_PAY_TO') ??
      FALLBACK_PAY_TO
    );
  }

  private usdcExactRequirements() {
    return {
      scheme: 'exact',
      network: this.x402Network(),
      amount: X402_AMOUNT_ATOMIC,
      asset: this.x402Token(),
      payTo: this.x402PayTo(),
      maxTimeoutSeconds: X402_MAX_TIMEOUT_SECONDS,
      extra: {
        name: 'United Stables',
        version: '1',
      },
    };
  }

  private paymentAddresses(body: unknown): { payer?: string; payTo?: string } {
    const typed = body as {
      paymentPayload?: {
        payload?: { authorization?: { from?: string; to?: string } };
      };
      paymentRequirements?: { payTo?: string };
    };
    return {
      payer: typed.paymentPayload?.payload?.authorization?.from,
      payTo:
        typed.paymentRequirements?.payTo ??
        typed.paymentPayload?.payload?.authorization?.to,
    };
  }

  private facilitatorErrorMessage(path: string, response: FacilitatorResponse): string {
    const body = (response.json ?? {}) as FacilitatorErrorBody;
    return [
      `${path} ${response.status}`,
      body.invalidReason,
      body.invalidReasonDetails,
      body.errorReason,
      body.errorMessage,
      body.error,
      !response.json ? response.text : null,
    ]
      .filter(Boolean)
      .join(' - ');
  }

  private normalizeAddress(value: string): string {
    return value.trim().toLowerCase();
  }

  private getDemoSeller(agentId?: string | null): DemoSeller | null {
    if (!agentId) return null;
    return DEMO_SELLERS.find((seller) => seller.agentId === agentId) ?? null;
  }

  private receipt(opts: {
    payer?: string | null;
    payTo?: string | null;
    settleTx?: string | null;
  }): AgentWork['receipt'] {
    return {
      paid: X402_PAYMENT_AMOUNT,
      asset: 'U',
      network: this.x402Network(),
      payer: opts.payer ?? null,
      payTo: opts.payTo ?? null,
      tx: opts.settleTx ?? null,
    };
  }

  private async resolvePaidWork(opts: {
    agentId: string;
    agentName?: string | null;
    payer?: string | null;
    payTo?: string | null;
    settleTx?: string | null;
  }): Promise<AgentWork> {
    const demo = this.getDemoSeller(opts.agentId);
    if (demo) {
      return {
        agent: demo.name,
        kind: demo.agentId,
        source: 'demo seller - frozen JSON',
        json: demo.json,
        receipt: this.receipt(opts),
      };
    }

    const indexed = await this.fetchIndexedJson(opts.agentId);
    return {
      agent: opts.agentName || opts.agentId,
      kind: opts.agentId,
      source: indexed.source,
      json: indexed.json,
      receipt: this.receipt(opts),
    };
  }

  private async fetchIndexedJson(agentId: string): Promise<{ source: string; json: unknown }> {
    try {
      const agent = await this.agentsService.findById(agentId);
      const registration = this.decodeDataJsonUri(agent.agentUri) ?? agent;
      const urls = [
        ...this.declaredServiceUrls(agent),
        ...this.collectHttpUrls(registration),
      ]
        .filter((url, idx, all) => all.indexOf(url) === idx)
        .sort((a, b) => this.urlPriority(a) - this.urlPriority(b))
        .slice(0, 5);

      for (const url of urls) {
        try {
          const res = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(8000),
          });
          const json = await this.readUnknown(res);
          if (this.isUsableServicePayload(json)) {
            return { source: url, json };
          }
        } catch {
          // endpoint down or not callable
        }
      }

      return {
        source: 'erc-8004 registration',
        json: {
          note: 'No machine-callable A2A/MCP JSON found. Registration may describe a human/OAuth service.',
          registration,
        },
      };
    } catch (error) {
      return {
        source: 'indexer',
        json: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  private declaredServiceUrls(record: unknown): string[] {
    if (!record || typeof record !== 'object') return [];
    const rec = record as Record<string, unknown>;
    const endpoints = rec.endpoints as Record<string, unknown> | undefined;
    const a2a = rec.a2a as Record<string, unknown> | undefined;
    const raw = [
      typeof endpoints?.a2a === 'string' ? endpoints.a2a : null,
      typeof endpoints?.mcp === 'string' ? endpoints.mcp : null,
      typeof endpoints?.agentUrl === 'string' ? endpoints.agentUrl : null,
      typeof a2a?.endpoint === 'string' ? a2a.endpoint : null,
      typeof rec.agentUri === 'string' ? rec.agentUri : null,
    ];
    return raw.filter(
      (url): url is string => this.isLiveHttpUrl(url) && this.isMachineCallableUrl(url),
    );
  }

  private collectHttpUrls(value: unknown, out = new Set<string>()): string[] {
    if (typeof value === 'string') {
      const matches = value.match(/https?:\/\/[^\s"'<>\\]+/gi) ?? [];
      for (const raw of matches) {
        const cleaned = raw.replace(/[),.;]+$/, '');
        if (this.isLiveHttpUrl(cleaned) && this.isMachineCallableUrl(cleaned)) out.add(cleaned);
      }
    } else if (Array.isArray(value)) {
      for (const item of value) this.collectHttpUrls(item, out);
    } else if (value && typeof value === 'object') {
      for (const item of Object.values(value as Record<string, unknown>)) {
        this.collectHttpUrls(item, out);
      }
    }
    return [...out];
  }

  private async readUnknown(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) return { status: res.status, empty: true };
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('text/html') || /<!DOCTYPE\s+html|<html[\s>]/i.test(text)) {
      return { status: res.status, text, html: true };
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return { status: res.status, text };
    }
  }

  private decodeDataJsonUri(value?: string | null): unknown | null {
    if (!value) return null;
    const match = value.match(/^data:application\/json(?:;charset=[^;,]+)?;base64,(.+)$/i);
    if (!match) return null;
    try {
      return JSON.parse(Buffer.from(match[1], 'base64').toString('utf8')) as unknown;
    } catch {
      return null;
    }
  }

  private isLiveHttpUrl(value?: string | null): value is string {
    if (!value) return false;
    const url = value.toLowerCase();
    if (url.includes('.example') || url.includes('example.com')) return false;
    if (url.startsWith('erc8004://') || url.startsWith('ipfs://')) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  }

  private isMachineCallableUrl(url: string): boolean {
    const u = url.toLowerCase();
    if (u.includes('amazoncognito.com')) return false;
    if (u.includes('/oauth2/')) return false;
    if (u.includes('/login') || u.includes('/signin')) return false;
    if (u.includes('accounts.google.com')) return false;
    if (u.includes('github.com/')) return false;
    if (u.includes('twitter.com') || u.includes('x.com/')) return false;
    if (u.includes('linkedin.com')) return false;
    return true;
  }

  private urlPriority(url: string): number {
    const u = url.toLowerCase();
    if (u.includes('agent-card') || u.includes('/.well-known/')) return 0;
    if (u.includes('/a2a') || u.includes('/mcp')) return 1;
    return 2;
  }

  private looksLikeHtml(json: unknown): boolean {
    if (!json || typeof json !== 'object') return false;
    const rec = json as Record<string, unknown>;
    return typeof rec.text === 'string' && /<!DOCTYPE\s+html|<html[\s>]/i.test(rec.text);
  }

  private isUsableServicePayload(json: unknown): boolean {
    if (!json || typeof json !== 'object') return false;
    if (this.looksLikeHtml(json)) return false;
    const rec = json as Record<string, unknown>;
    if ('empty' in rec) return false;
    if ('error' in rec && Object.keys(rec).length <= 1) return false;
    return true;
  }
}

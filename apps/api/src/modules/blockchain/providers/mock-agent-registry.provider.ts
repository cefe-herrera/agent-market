import { Injectable } from '@nestjs/common';
import {
  AgentCategory,
  ExternalAgent,
  RiskLevel,
} from '@bnb-marketplace/shared-types';
import { AgentRegistryProvider } from '../interfaces/agent-registry.provider';

/**
 * Simulates ERC-8004 registry entries for agents published via BNB Agent Studio.
 * Replace with Erc8004RegistryProvider when connecting to BSC mainnet/testnet.
 */
@Injectable()
export class MockAgentRegistryProvider implements AgentRegistryProvider {
  private readonly mockAgents: ExternalAgent[] = [
    {
      agentId: 'erc8004-1001',
      name: 'YieldRouter Studio',
      ownerWallet: '0xStudioOwner1001a1b2c3d4e5f6789012345678901234',
      agentWallet: '0xStudioAgent1001a1b2c3d4e5f6789012345678901234',
      agentUri: 'ipfs://bnb-agent-studio/yield-router-v1',
      network: 'BNB Chain',
      chainId: 56,
      isTestnet: false,
      shortDescription: 'Routes stablecoin yield across Venus and Lista DAO.',
      description:
        'An ERC-8004 agent published through BNB Agent Studio. Continuously scans lending markets on BNB Chain and reallocates capital to the best risk-adjusted vaults.',
      category: AgentCategory.YIELD_OPTIMISATION,
      protocols: ['Venus', 'Lista DAO'],
      supportedAssets: ['USDT', 'USDC', 'BNB'],
      strategyName: 'Multi-Protocol Yield Router',
      strategyDescription: 'Automated yield rotation with conservative risk caps.',
      riskLevel: RiskLevel.LOW,
      minimumCapital: 200,
      recommendedCapital: 1000,
      executionFrequency: 'Every 6 hours',
      publishedAt: '2026-08-10T12:00:00.000Z',
    },
    {
      agentId: 'erc8004-1002',
      name: 'GridPulse Studio',
      ownerWallet: '0xStudioOwner1002a1b2c3d4e5f6789012345678901234',
      agentWallet: '0xStudioAgent1002a1b2c3d4e5f6789012345678901234',
      agentUri: 'ipfs://bnb-agent-studio/grid-pulse-v1',
      network: 'BNB Chain',
      chainId: 56,
      isTestnet: false,
      shortDescription: 'Grid trading bot for BNB/USDT on PancakeSwap.',
      description:
        'Studio-deployed grid trader registered on-chain via ERC-8004. Places layered buy/sell orders within a configurable price band.',
      category: AgentCategory.GRID_TRADING,
      protocols: ['PancakeSwap'],
      supportedAssets: ['BNB', 'USDT'],
      strategyName: 'Adaptive Grid Engine',
      strategyDescription: 'Dynamic grid spacing based on recent volatility.',
      riskLevel: RiskLevel.MEDIUM,
      minimumCapital: 500,
      recommendedCapital: 2000,
      executionFrequency: 'Real-time',
      publishedAt: '2026-08-12T09:30:00.000Z',
    },
    {
      agentId: 'erc8004-1003',
      name: 'LP Range Keeper',
      ownerWallet: '0xStudioOwner1003a1b2c3d4e5f6789012345678901234',
      agentWallet: '0xStudioAgent1003a1b2c3d4e5f6789012345678901234',
      agentUri: 'ipfs://bnb-agent-studio/lp-range-keeper-v1',
      network: 'BNB Chain',
      chainId: 56,
      isTestnet: false,
      shortDescription: 'Keeps PancakeSwap V3 LP positions in range.',
      description:
        'Liquidity management agent from BNB Agent Studio. Monitors concentrated liquidity positions and rebalances ranges when price exits bounds.',
      category: AgentCategory.REBALANCING,
      protocols: ['PancakeSwap'],
      supportedAssets: ['BNB', 'USDT', 'ETH'],
      strategyName: 'Concentrated LP Guardian',
      strategyDescription: 'Range rebalancing with fee-aware execution.',
      riskLevel: RiskLevel.MEDIUM,
      minimumCapital: 300,
      recommendedCapital: 1500,
      executionFrequency: 'Hourly',
      publishedAt: '2026-08-14T16:45:00.000Z',
    },
    {
      agentId: 'erc8004-1004',
      name: 'HealthFactor Sentinel',
      ownerWallet: '0xStudioOwner1004a1b2c3d4e5f6789012345678901234',
      agentWallet: '0xStudioAgent1004a1b2c3d4e5f6789012345678901234',
      agentUri: 'ipfs://bnb-agent-studio/health-factor-sentinel-v1',
      network: 'BNB Chain',
      chainId: 56,
      isTestnet: false,
      shortDescription: 'Monitors Venus positions and prevents liquidations.',
      description:
        'Loan protection agent registered through BNB Agent Studio. Watches health factors and executes preventive repayments or collateral top-ups.',
      category: AgentCategory.HEALTH_FACTOR_MONITORING,
      protocols: ['Venus'],
      supportedAssets: ['BNB', 'USDT', 'BTCB'],
      strategyName: 'Liquidation Shield',
      strategyDescription: 'Proactive health factor maintenance with configurable safety margin.',
      riskLevel: RiskLevel.LOW,
      minimumCapital: 100,
      recommendedCapital: 500,
      executionFrequency: 'Every 15 minutes',
      publishedAt: '2026-08-16T08:00:00.000Z',
    },
  ];

  async getAgents(): Promise<ExternalAgent[]> {
    return this.mockAgents;
  }

  async getAgent(agentId: string): Promise<ExternalAgent> {
    const agent = this.mockAgents.find((a) => a.agentId === agentId);
    if (!agent) throw new Error(`External agent ${agentId} not found`);
    return agent;
  }

  async verifyOwnership(agentId: string, wallet: string): Promise<boolean> {
    const agent = this.mockAgents.find((a) => a.agentId === agentId);
    return agent?.ownerWallet.toLowerCase() === wallet.toLowerCase();
  }
}

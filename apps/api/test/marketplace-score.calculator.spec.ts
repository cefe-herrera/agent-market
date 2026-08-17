import { MarketplaceScoreCalculator } from '../src/modules/marketplace/marketplace-score.calculator';
import { RiskLevel } from '@bnb-marketplace/shared-types';

describe('MarketplaceScoreCalculator', () => {
  const baseMetrics = {
    agentId: 'test',
    aum: 1_000_000,
    managedVolume: 5_000_000,
    totalExecutions: 1000,
    successfulExecutions: 980,
    failedExecutions: 20,
    successRate: 98,
    return7d: 1.0,
    return30d: 4.0,
    return90d: 10.0,
    maxDrawdown30d: 3.0,
    averageExecutionTime: 10,
    averageGasCost: 0.3,
    uptime: 99.5,
    uniqueUsers: 200,
    totalRevenue: 30000,
    categoryMetrics: {},
    updatedAt: new Date().toISOString(),
  };

  it('should calculate score with all components', () => {
    const result = MarketplaceScoreCalculator.calculate(baseMetrics, RiskLevel.MEDIUM, 180);

    expect(result.performanceScore).toBeGreaterThan(0);
    expect(result.reliabilityScore).toBeGreaterThan(0);
    expect(result.riskScore).toBeGreaterThan(0);
    expect(result.trackRecordScore).toBeGreaterThan(0);
    expect(result.usageScore).toBeGreaterThan(0);
    expect(result.totalScore).toBeGreaterThan(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });

  it('should give higher risk score to LOW risk agents', () => {
    const lowRisk = MarketplaceScoreCalculator.calculate(baseMetrics, RiskLevel.LOW, 180);
    const highRisk = MarketplaceScoreCalculator.calculate(baseMetrics, RiskLevel.HIGH, 180);

    expect(lowRisk.riskScore).toBeGreaterThan(highRisk.riskScore);
  });

  it('should weight components correctly', () => {
    const result = MarketplaceScoreCalculator.calculate(baseMetrics, RiskLevel.MEDIUM, 365);

    const expected =
      result.performanceScore * 0.25 +
      result.reliabilityScore * 0.25 +
      result.riskScore * 0.20 +
      result.trackRecordScore * 0.15 +
      result.usageScore * 0.15;

    expect(result.totalScore).toBeCloseTo(expected, 1);
  });
});

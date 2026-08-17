import { AgentMetricsDto, MarketplaceScoreBreakdown, RiskLevel } from '@bnb-marketplace/shared-types';

/**
 * Marketplace Score Calculator
 *
 * Computes an objective comparison score for agents based on:
 * - Performance (25%): weighted returns over 7d, 30d, 90d
 * - Reliability (25%): success rate and uptime
 * - Risk (20%): inverse of risk level and max drawdown
 * - Track Record (15%): execution history and age proxy
 * - Usage (15%): AUM and unique users
 *
 * Formula:
 * score = performanceScore * 0.25 +
 *         reliabilityScore * 0.25 +
 *         riskScore * 0.20 +
 *         trackRecordScore * 0.15 +
 *         usageScore * 0.15
 */
export class MarketplaceScoreCalculator {
  private static readonly WEIGHTS = {
    performance: 0.25,
    reliability: 0.25,
    risk: 0.20,
    trackRecord: 0.15,
    usage: 0.15,
  };

  static calculate(
    metrics: AgentMetricsDto,
    riskLevel: RiskLevel,
    agentAgeDays: number,
  ): MarketplaceScoreBreakdown {
    const performanceScore = this.calcPerformanceScore(metrics);
    const reliabilityScore = this.calcReliabilityScore(metrics);
    const riskScore = this.calcRiskScore(metrics, riskLevel);
    const trackRecordScore = this.calcTrackRecordScore(metrics, agentAgeDays);
    const usageScore = this.calcUsageScore(metrics);

    const totalScore =
      performanceScore * this.WEIGHTS.performance +
      reliabilityScore * this.WEIGHTS.reliability +
      riskScore * this.WEIGHTS.risk +
      trackRecordScore * this.WEIGHTS.trackRecord +
      usageScore * this.WEIGHTS.usage;

    return {
      performanceScore: round2(performanceScore),
      reliabilityScore: round2(reliabilityScore),
      riskScore: round2(riskScore),
      trackRecordScore: round2(trackRecordScore),
      usageScore: round2(usageScore),
      totalScore: round2(totalScore),
    };
  }

  private static calcPerformanceScore(metrics: AgentMetricsDto): number {
    const cm = metrics.categoryMetrics ?? {};
    const totalScore = Number(cm['totalScore'] ?? 0);
    const hasReturns =
      metrics.return7d !== 0 || metrics.return30d !== 0 || metrics.return90d !== 0;

    if (!hasReturns && totalScore > 0) {
      return clamp(totalScore, 0, 100);
    }

    const weightedReturn =
      metrics.return7d * 0.2 + metrics.return30d * 0.5 + metrics.return90d * 0.3;
    return clamp(weightedReturn * 10 + 50, 0, 100);
  }

  private static calcReliabilityScore(metrics: AgentMetricsDto): number {
    return clamp(metrics.successRate * 0.7 + metrics.uptime * 0.3, 0, 100);
  }

  private static calcRiskScore(metrics: AgentMetricsDto, riskLevel: RiskLevel): number {
    const riskMap: Record<RiskLevel, number> = {
      LOW: 90,
      MEDIUM: 70,
      HIGH: 45,
      VERY_HIGH: 20,
    };
    const baseRisk = riskMap[riskLevel] ?? 50;
    const drawdownPenalty = Math.min(metrics.maxDrawdown30d * 2, 30);
    return clamp(baseRisk - drawdownPenalty, 0, 100);
  }

  private static calcTrackRecordScore(metrics: AgentMetricsDto, agentAgeDays: number): number {
    const executionScore = Math.min(metrics.totalExecutions / 100, 1) * 50;
    const ageScore = Math.min(agentAgeDays / 365, 1) * 50;
    return clamp(executionScore + ageScore, 0, 100);
  }

  private static calcUsageScore(metrics: AgentMetricsDto): number {
    const cm = metrics.categoryMetrics ?? {};
    const feedbacks = Number(cm['totalFeedbacks'] ?? 0);
    const stars = Number(cm['starCount'] ?? metrics.uniqueUsers);

    if (metrics.aum === 0 && (feedbacks > 0 || stars > 0)) {
      const feedbackScore = Math.min(feedbacks / 50, 1) * 50;
      const starScore = Math.min(stars / 100, 1) * 50;
      return clamp(feedbackScore + starScore, 0, 100);
    }

    const aumScore = Math.min(metrics.aum / 5_000_000, 1) * 60;
    const userScore = Math.min(metrics.uniqueUsers / 500, 1) * 40;
    return clamp(aumScore + userScore, 0, 100);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

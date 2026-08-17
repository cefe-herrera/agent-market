import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketplaceAgentDto, AgentSource } from '@bnb-marketplace/shared-types';
import { riskBadgeClass, formatNumber } from '../../../core/utils/formatters';
import { CompareStateService } from '../../../core/services/compare-state.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-agent-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <article class="agent-card">
      <div class="agent-card-meta">
        <div class="agent-card-badges">
          @if (agent.source === erc8004Source || agent.source === studioSource) {
            <span class="agent-card-studio">{{ t('card.erc8004Badge') }}</span>
          }
          <span [class]="agent.isTestnet ? 'agent-card-testnet' : 'agent-card-chain'">
            {{ agent.network }}
          </span>
        </div>
        @if (agent.verified) {
          <span class="agent-card-verified" [attr.aria-label]="t('common.verified')">✓</span>
        }
      </div>

      <header class="agent-card-header">
        <a [routerLink]="['/agents', agent.slug]" class="agent-card-title">{{ agent.name }}</a>
        <p class="agent-card-category">{{ t('category.' + agent.category) }}</p>
      </header>

      <div class="agent-card-tags">
        @for (protocol of agent.protocols.slice(0, 2); track protocol) {
          <span class="badge-gray">{{ protocol }}</span>
        }
        <span [class]="riskBadgeClass(agent.riskLevel)">{{ t('risk.' + agent.riskLevel) }}</span>
      </div>

      @if (agent.metrics) {
        <div class="agent-card-metrics">
          <div>
            <p class="agent-card-metric-label">{{ t('card.healthScore') }}</p>
            <p class="agent-card-metric-value">{{ scanMetric('healthScore', agent.metrics.uptime).toFixed(0) }}</p>
          </div>
          <div>
            <p class="agent-card-metric-label">{{ t('card.successRate') }}</p>
            <p class="agent-card-metric-value">{{ agent.metrics.successRate.toFixed(1) }}%</p>
          </div>
          <div>
            <p class="agent-card-metric-label">{{ t('card.validations') }}</p>
            <p class="agent-card-metric-value">{{ formatNumber(agent.metrics.totalExecutions, locale()) }}</p>
          </div>
          <div>
            <p class="agent-card-metric-label">{{ t('card.stars') }}</p>
            <p class="agent-card-metric-value">{{ scanMetric('starCount', agent.metrics.uniqueUsers) }}</p>
          </div>
        </div>
      }

      <footer class="agent-card-footer">
        <a [routerLink]="['/agents', agent.slug]" class="btn-primary agent-card-cta text-center">{{ t('card.viewAgent') }}</a>
        @if (showCompare) {
          <button
            type="button"
            (click)="toggleCompare()"
            class="agent-card-add"
            [class.is-selected]="compareState.isSelected(agent.id)"
            [attr.aria-label]="compareState.isSelected(agent.id) ? 'Selected' : 'Add to compare'"
          >
            {{ compareState.isSelected(agent.id) ? '✓' : '+' }}
          </button>
        }
      </footer>
    </article>
  `,
})
export class AgentCardComponent {
  @Input({ required: true }) agent!: MarketplaceAgentDto;
  @Input() showCompare = true;

  readonly erc8004Source = AgentSource.ERC8004;
  readonly studioSource = AgentSource.BNB_AGENT_STUDIO;
  readonly compareState = inject(CompareStateService);
  private readonly i18n = inject(I18nService);

  readonly t = this.i18n.t;
  readonly locale = this.i18n.locale;

  readonly riskBadgeClass = riskBadgeClass;
  readonly formatNumber = formatNumber;

  scanMetric(key: string, fallback: number): number {
    const value = this.agent.metrics?.categoryMetrics?.[key];
    return typeof value === 'number' ? value : fallback;
  }

  toggleCompare(): void {
    this.compareState.toggle(this.agent);
  }
}

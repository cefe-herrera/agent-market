import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { CompareStateService } from '../../core/services/compare-state.service';
import { CompareAgentDto } from '@bnb-marketplace/shared-types';
import { formatCurrency, formatPercent, formatNumber } from '../../core/utils/formatters';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <p class="label-terminal mb-3">// {{ t('compare.title') }}</p>
          <h1 class="font-pixel text-2xl text-surface-950">{{ t('compare.title') }}</h1>
          <p class="mt-2 font-mono-data text-sm text-surface-500">{{ t('compare.subtitle') }}</p>
        </div>
        @if (compareState.count() > 0) {
          <button (click)="compareState.clear()" class="btn-secondary text-sm">{{ t('compare.clear') }}</button>
        }
      </div>

      @if (compareState.count() === 0) {
        <div class="card py-12 text-center">
          <p class="text-surface-500">{{ t('compare.empty') }}</p>
          <a routerLink="/agents" class="btn-primary mt-4 inline-block">{{ t('compare.browse') }}</a>
        </div>
      } @else if (loading()) {
        <p class="text-surface-500">{{ t('compare.loading') }}</p>
      } @else {
        <div class="overflow-x-auto rounded border border-surface-300">
          <table class="table-dark w-full min-w-[800px] border-collapse">
            <thead>
              <tr>
                <th class="p-3 text-left">{{ t('compare.metric') }}</th>
                @for (agent of agents(); track agent.id) {
                  <th class="p-3 text-left">
                    <a [routerLink]="['/agents', agent.slug]" class="font-mono-data font-medium text-brand-500 no-underline hover:text-brand-400">{{ agent.name }}</a>
                    <p class="font-mono-data text-xs text-surface-500">{{ t('category.' + agent.category) }}</p>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of comparisonRows(); track row.label) {
                <tr>
                  <td class="font-mono-data font-medium text-surface-500">{{ row.label }}</td>
                  @for (value of row.values; track $index) {
                    <td class="font-mono-data text-surface-950">{{ value }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (agents().length > 0 && agents()[0].scoreBreakdown) {
          <div class="mt-8 card">
            <h2 class="mb-4 font-mono-data text-xs uppercase tracking-wider text-surface-500">{{ t('compare.scoreTitle') }}</h2>
            <p class="mb-4 font-mono-data text-sm text-surface-500">{{ t('compare.scoreFormula') }}</p>
            <div class="overflow-x-auto rounded border border-surface-300">
              <table class="table-dark w-full min-w-[600px]">
                <thead>
                  <tr>
                    <th class="p-2">{{ t('compare.component') }}</th>
                    @for (agent of agents(); track agent.id) {
                      <th class="p-2">{{ agent.name }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (comp of scoreComponents; track comp.key) {
                    <tr>
                      <td class="p-2 font-medium text-surface-600">{{ t(comp.labelKey) }} ({{ comp.weight }})</td>
                      @for (agent of agents(); track agent.id) {
                        <td class="p-2 font-mono-data text-surface-950">{{ getScoreValue(agent, comp.key) }}</td>
                      }
                    </tr>
                  }
                  <tr class="border-t-2 border-surface-300">
                    <td class="p-2 font-mono-data font-medium text-brand-500">{{ t('compare.totalScore') }}</td>
                    @for (agent of agents(); track agent.id) {
                      <td class="p-2 font-mono-data font-medium text-surface-950">{{ agent.marketplaceScore?.toFixed(1) ?? '—' }}</td>
                    }
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class CompareComponent implements OnInit {
  readonly agents = signal<CompareAgentDto[]>([]);
  readonly loading = signal(true);

  readonly compareState = inject(CompareStateService);
  private readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  readonly locale = this.i18n.locale;

  readonly scoreComponents = [
    { key: 'performanceScore', labelKey: 'compare.performance', weight: '25%' },
    { key: 'reliabilityScore', labelKey: 'compare.reliability', weight: '25%' },
    { key: 'riskScore', labelKey: 'compare.risk', weight: '20%' },
    { key: 'trackRecordScore', labelKey: 'compare.trackRecord', weight: '15%' },
    { key: 'usageScore', labelKey: 'compare.usage', weight: '15%' },
  ];

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    const ids = this.compareState.ids();
    if (ids.length === 0) {
      this.loading.set(false);
      return;
    }
    this.api.compareAgents(ids).subscribe({
      next: (agents) => {
        this.agents.set(agents);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  comparisonRows(): { label: string; values: string[] }[] {
    const agents = this.agents();
    if (!agents.length) return [];
    const loc = this.locale();

    return [
      { label: this.t('compare.return30d'), values: agents.map((a) => formatPercent(a.metrics?.return30d ?? 0, loc)) },
      { label: this.t('compare.risk'), values: agents.map((a) => this.t('risk.' + a.riskLevel)) },
      { label: this.t('compare.aum'), values: agents.map((a) => formatCurrency(a.metrics?.aum ?? 0, loc)) },
      { label: this.t('compare.successRate'), values: agents.map((a) => `${(a.metrics?.successRate ?? 0).toFixed(1)}%`) },
      { label: this.t('compare.maxDrawdown'), values: agents.map((a) => `${(a.metrics?.maxDrawdown30d ?? 0).toFixed(1)}%`) },
      { label: this.t('compare.executions'), values: agents.map((a) => formatNumber(a.metrics?.totalExecutions ?? 0, loc)) },
      { label: this.t('compare.users'), values: agents.map((a) => String(a.metrics?.uniqueUsers ?? 0)) },
      { label: this.t('compare.avgGasCost'), values: agents.map((a) => `$${(a.metrics?.averageGasCost ?? 0).toFixed(2)}`) },
      { label: this.t('compare.minCapital'), values: agents.map((a) => `${a.minimumCapital} ${a.supportedAssets[0]}`) },
      { label: this.t('compare.score'), values: agents.map((a) => a.marketplaceScore?.toFixed(1) ?? '—') },
    ];
  }

  getScoreValue(agent: CompareAgentDto, key: string): string {
    const breakdown = agent.scoreBreakdown;
    if (!breakdown) return '—';
    const val = breakdown[key as keyof typeof breakdown];
    return typeof val === 'number' ? val.toFixed(1) : '—';
  }
}

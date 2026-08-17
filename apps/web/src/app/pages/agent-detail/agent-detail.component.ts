import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AgentDto, AgentMetricsDto, AgentPermissionDto, PerformanceChartPoint } from '@bnb-marketplace/shared-types';
import { riskBadgeClass, formatCurrency, formatPercent, formatNumber } from '../../core/utils/formatters';
import { PerformanceChartComponent } from '../../shared/components/performance-chart/performance-chart.component';
import { HireModalComponent } from '../../shared/components/hire-modal/hire-modal.component';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-agent-detail',
  standalone: true,
  imports: [RouterLink, PerformanceChartComponent, HireModalComponent],
  template: `
    @if (loading()) {
      <div class="mx-auto max-w-7xl px-4 py-16 text-center text-surface-500">{{ t('detail.loading') }}</div>
    } @else if (agent()) {
      <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <!-- Header -->
        <div class="mb-8">
          <a routerLink="/agents" class="font-mono-data text-xs text-brand-500 no-underline hover:text-brand-400">← {{ t('common.back') }}</a>
          <div class="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-3">
                <h1 class="font-pixel text-2xl text-surface-950 sm:text-3xl">{{ agent()!.name }}</h1>
                @if (agent()!.verified) {
                  <span class="badge-green">✓ {{ t('common.verified') }}</span>
                }
              </div>
              <p class="mt-2 font-mono-data text-sm text-surface-500">{{ agent()!.shortDescription }}</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <span class="badge-gray">{{ t('category.' + agent()!.category) }}</span>
                @for (p of agent()!.protocols; track p) {
                  <span class="badge-gray">{{ p }}</span>
                }
                <span [class]="riskBadgeClass(agent()!.riskLevel)">{{ t('risk.' + agent()!.riskLevel) }}</span>
              </div>
            </div>
            <button (click)="showHireModal.set(true)" class="btn-primary">{{ t('detail.hireAgent') }}</button>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-3">
          <div class="lg:col-span-2 space-y-6">
            <!-- Performance -->
            <section class="card">
              <h2 class="mb-4 font-mono-data text-xs uppercase tracking-wider text-surface-500">{{ t('detail.performance') }}</h2>
              @if (metrics()) {
                <div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p class="font-mono-data text-xs text-surface-500">{{ t('detail.healthScore') }}</p>
                    <p class="font-mono-data text-lg font-medium text-surface-950">{{ scanMetric('healthScore', metrics()!.uptime).toFixed(0) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-surface-500">{{ t('detail.totalScore') }}</p>
                    <p class="text-lg font-semibold">{{ scanMetric('totalScore', 0).toFixed(1) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-surface-500">{{ t('detail.successRate') }}</p>
                    <p class="text-lg font-semibold">{{ metrics()!.successRate.toFixed(1) }}%</p>
                  </div>
                  <div>
                    <p class="text-xs text-surface-500">{{ t('detail.executions') }}</p>
                    <p class="text-lg font-semibold">{{ formatNumber(metrics()!.totalExecutions, locale()) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-surface-500">{{ t('detail.feedbacks') }}</p>
                    <p class="text-lg font-semibold">{{ scanMetric('totalFeedbacks', 0) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-surface-500">{{ t('detail.stars') }}</p>
                    <p class="text-lg font-semibold">{{ scanMetric('starCount', metrics()!.uniqueUsers) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-surface-500">{{ t('detail.users') }}</p>
                    <p class="text-lg font-semibold">{{ metrics()!.uniqueUsers }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-surface-500">{{ t('detail.uptime') }}</p>
                    <p class="text-lg font-semibold">{{ metrics()!.uptime.toFixed(1) }}%</p>
                  </div>
                </div>
              }
              @if (chartData().length) {
                <app-performance-chart [data]="chartData()" [title]="t('detail.chartTitle')" />
              }
            </section>

            <!-- Strategy -->
            <section class="card">
              <h2 class="mb-4 font-mono-data text-xs uppercase tracking-wider text-surface-500">{{ t('detail.strategy') }}</h2>
              <h3 class="font-mono-data font-medium text-surface-950">{{ agent()!.strategyName }}</h3>
              <p class="mt-2 font-mono-data text-sm text-surface-500">{{ agent()!.strategyDescription }}</p>
              <div class="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                <div class="rounded border border-surface-300 bg-surface-50 p-3">
                  <p class="font-mono-data text-xs text-surface-500">{{ t('detail.executionFrequency') }}</p>
                  <p class="font-mono-data font-medium text-surface-950">{{ agent()!.executionFrequency }}</p>
                </div>
                <div class="rounded border border-surface-300 bg-surface-50 p-3">
                  <p class="font-mono-data text-xs text-surface-500">{{ t('detail.protocols') }}</p>
                  <p class="font-mono-data font-medium text-surface-950">{{ agent()!.protocols.join(', ') }}</p>
                </div>
              </div>
            </section>

            <!-- Permissions -->
            <section class="card">
              <h2 class="mb-4 text-lg font-semibold">{{ t('detail.permissionsTitle') }}</h2>
              <div class="grid gap-6 sm:grid-cols-2">
                <div>
                  <p class="mb-2 font-mono-data text-sm font-medium text-brand-500">{{ t('detail.allowed') }}</p>
                  @for (perm of allowedPerms(); track perm.id) {
                    <div class="mb-1 flex gap-2 font-mono-data text-sm">
                      <span class="text-brand-500">✓</span>
                      <span>{{ perm.description }}</span>
                    </div>
                  }
                </div>
                <div>
                  <p class="mb-2 font-mono-data text-sm font-medium text-red-400">{{ t('detail.notAllowed') }}</p>
                  @for (perm of deniedPerms(); track perm.id) {
                    <div class="mb-1 flex gap-2 font-mono-data text-sm text-surface-500">
                      <span class="text-red-400">✗</span>
                      <span>{{ perm.description }}</span>
                    </div>
                  }
                </div>
              </div>
            </section>

            <!-- Track Record -->
            <section class="card">
              <h2 class="mb-4 text-lg font-semibold">{{ t('detail.trackRecord') }}</h2>
              @if (metrics()) {
                <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
                  <div>
                    <p class="text-xs text-surface-500">{{ t('detail.agentAge') }}</p>
                    <p class="font-medium">{{ agentAge() }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-surface-500">{{ t('detail.totalExecutions') }}</p>
                    <p class="font-medium">{{ formatNumber(metrics()!.totalExecutions, locale()) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-surface-500">{{ t('detail.successful') }}</p>
                    <p class="font-medium">{{ formatNumber(metrics()!.successfulExecutions, locale()) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-surface-500">{{ t('detail.failed') }}</p>
                    <p class="font-medium">{{ formatNumber(metrics()!.failedExecutions, locale()) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-surface-500">{{ t('detail.avgGasCost') }}</p>
                    <p class="font-medium">{{ formatGasCost(metrics()!.averageGasCost) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-surface-500">{{ t('detail.uptime') }}</p>
                    <p class="font-medium">{{ metrics()!.uptime.toFixed(1) }}%</p>
                  </div>
                </div>
              }
            </section>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <section class="card">
              <h2 class="mb-4 text-lg font-semibold">{{ t('detail.risk') }}</h2>
              <div class="space-y-3 text-sm">
                <div>
                  <p class="text-xs text-surface-500">{{ t('detail.riskLevel') }}</p>
                  <span [class]="riskBadgeClass(agent()!.riskLevel)">{{ t('risk.' + agent()!.riskLevel) }}</span>
                </div>
                @if (metrics()) {
                  <div>
                    <p class="text-xs text-surface-500">{{ t('detail.maxDrawdown') }}</p>
                    <p class="font-medium">{{ metrics()!.maxDrawdown30d.toFixed(1) }}%</p>
                  </div>
                }
                <div>
                  <p class="text-xs text-surface-500">{{ t('detail.minCapital') }}</p>
                  <p class="font-medium">{{ agent()!.minimumCapital }} {{ agent()!.supportedAssets[0] }}</p>
                </div>
                <div>
                  <p class="text-xs text-surface-500">{{ t('detail.recommendedCapital') }}</p>
                  <p class="font-medium">{{ agent()!.recommendedCapital }} {{ agent()!.supportedAssets[0] }}</p>
                </div>
                <div>
                  <p class="text-xs text-surface-500">{{ t('detail.supportedAssets') }}</p>
                  <p class="font-medium">{{ agent()!.supportedAssets.join(', ') }}</p>
                </div>
              </div>
              <button (click)="showHireModal.set(true)" class="btn-primary mt-6 w-full">{{ t('detail.hireAgent') }}</button>
            </section>

            @if (categoryMetrics().length) {
              <section class="card">
                <h2 class="mb-4 text-lg font-semibold">{{ t('detail.categoryMetrics') }}</h2>
                @for (item of categoryMetrics(); track item.key) {
                  <div class="mb-2 flex justify-between text-sm">
                    <span class="text-surface-600">{{ item.label }}</span>
                    <span class="font-medium">{{ item.value }}</span>
                  </div>
                }
              </section>
            }
          </div>
        </div>
      </div>

      @if (showHireModal() && agent()) {
        <app-hire-modal
          [agent]="agent()!"
          [permissions]="permissions()"
          (close)="showHireModal.set(false)"
          (hired)="showHireModal.set(false)"
        />
      }
    }
  `,
})
export class AgentDetailComponent implements OnInit {
  readonly agent = signal<AgentDto | null>(null);
  readonly metrics = signal<AgentMetricsDto | null>(null);
  readonly permissions = signal<AgentPermissionDto[]>([]);
  readonly chartData = signal<PerformanceChartPoint[]>([]);
  readonly loading = signal(true);
  readonly showHireModal = signal(false);

  private readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  readonly locale = this.i18n.locale;

  readonly riskBadgeClass = riskBadgeClass;
  readonly formatCurrency = formatCurrency;
  readonly formatPercent = formatPercent;
  readonly formatNumber = formatNumber;

  constructor(
    private readonly api: ApiService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    forkJoin({
      agent: this.api.getAgent(slug),
      metrics: this.api.getAgentMetrics(slug),
      permissions: this.api.getAgentPermissions(slug),
      chart: this.api.getAgentChart(slug),
    }).subscribe({
      next: ({ agent, metrics, permissions, chart }) => {
        this.agent.set(agent);
        this.metrics.set(metrics);
        this.permissions.set(permissions);
        this.chartData.set(chart);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  allowedPerms(): AgentPermissionDto[] {
    return this.permissions().filter((p) => p.allowed);
  }

  deniedPerms(): AgentPermissionDto[] {
    return this.permissions().filter((p) => !p.allowed);
  }

  agentAge(): string {
    const a = this.agent();
    if (!a) return '';
    const days = Math.floor((Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (days > 365) {
      return this.t('detail.ageYears', { years: Math.floor(days / 365), days: days % 365 });
    }
    return this.t('detail.ageDays', { days });
  }

  formatGasCost(value: number): string {
    return `$${value.toFixed(2)}`;
  }

  scanMetric(key: string, fallback: number): number {
    const value = this.metrics()?.categoryMetrics?.[key];
    return typeof value === 'number' ? value : fallback;
  }

  categoryMetrics(): { key: string; label: string; value: string }[] {
    const m = this.metrics()?.categoryMetrics;
    if (!m) return [];

    return Object.entries(m).map(([key, value]) => ({
      key,
      label: this.t('metric.' + key),
      value:
        typeof value === 'number'
          ? key.includes('Apy') || key.includes('Rate') || key.includes('Efficiency')
            ? `${value}%`
            : formatNumber(value, this.locale(), Number.isInteger(value) ? 0 : 2)
          : String(value),
    }));
  }
}

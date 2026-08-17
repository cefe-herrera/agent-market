import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AgentCardComponent } from '../../shared/components/agent-card/agent-card.component';
import { MarketplaceAgentDto, CategoryInfo } from '@bnb-marketplace/shared-types';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, AgentCardComponent],
  template: `
    <!-- Hero -->
    <section class="hero-section mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 sm:py-28 lg:px-8">
      <p class="hero-eyebrow mb-8 justify-center">// {{ t('home.badge') }}</p>

      <h1 class="mx-auto max-w-3xl">
        <span class="hero-line-pixel hero-line-pixel--white">{{ t('home.heroLine1') }}</span>
        <span class="hero-line-pixel hero-line-pixel--accent">{{ t('home.heroLine2') }}</span>
      </h1>

      <p class="mx-auto mt-8 max-w-xl font-mono-data text-sm leading-relaxed text-surface-500 sm:text-[15px]">
        {{ t('home.subtitle') }}
      </p>

      <div class="mx-auto mt-14 max-w-3xl stats-bar">
        <div class="stat-item">
          <p class="stat-value">{{ stats().agents }}</p>
          <p class="stat-label">{{ t('home.statAgents') }}</p>
        </div>
        <div class="stat-item">
          <p class="stat-value">{{ stats().categories }}</p>
          <p class="stat-label">{{ t('home.statCategories') }}</p>
        </div>
        <div class="stat-item">
          <p class="stat-value">{{ stats().chains }}</p>
          <p class="stat-label">{{ t('home.statChains') }}</p>
        </div>
        <div class="stat-item">
          <p class="stat-value">{{ stats().verified }}</p>
          <p class="stat-label">{{ t('home.statVerified') }}</p>
        </div>
      </div>
    </section>

    <!-- Categories -->
    <section class="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        @for (cat of categories(); track cat.id) {
          <a [routerLink]="['/agents', cat.slug]" class="card-interactive group cursor-pointer no-underline">
            <h3 class="font-mono-data text-sm font-medium text-surface-950 group-hover:text-brand-500">{{ t('categoryName.' + cat.id) }}</h3>
            <p class="mt-2 font-mono-data text-xs leading-relaxed text-surface-500">{{ t('categoryTagline.' + cat.id) }}</p>
            <span class="mt-4 inline-block font-mono-data text-xs text-brand-500">{{ t('common.explore') }} →</span>
          </a>
        }
      </div>
    </section>

    <!-- Featured -->
    <section class="section-dark py-16">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-8 flex items-center justify-between">
          <div>
            <p class="label-terminal mb-2">// {{ t('home.featured') }}</p>
            <h2 class="font-pixel-square text-xl text-surface-950">{{ t('home.featured') }}</h2>
          </div>
          <a routerLink="/agents" class="font-mono-data text-xs text-brand-500 no-underline hover:text-brand-400">{{ t('common.viewAll') }} →</a>
        </div>

        @if (loading()) {
          <p class="font-mono-data text-sm text-surface-500">{{ t('home.loadingAgents') }}</p>
        } @else {
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            @for (agent of featured(); track agent.id) {
              <app-agent-card [agent]="agent" />
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class HomeComponent implements OnInit {
  readonly categories = signal<CategoryInfo[]>([]);
  readonly featured = signal<MarketplaceAgentDto[]>([]);
  readonly loading = signal(true);
  readonly t = inject(I18nService).t;

  readonly stats = signal({
    agents: 0,
    categories: 4,
    protocols: 0,
    verified: 0,
    chains: 0,
    mainnetAgents: 0,
    testnetAgents: 0,
    studioAgents: 0,
  });

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.api.getMarketplaceStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: () => {},
    });
    this.api.getCategories().subscribe((cats) => {
      this.categories.set(cats);
    });
    this.api.getFeaturedAgents().subscribe({
      next: (agents) => {
        this.featured.set(agents);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

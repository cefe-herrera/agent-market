import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AgentCardComponent } from '../../shared/components/agent-card/agent-card.component';
import { AgentFiltersComponent } from '../../shared/components/agent-filters/agent-filters.component';
import { MarketplaceAgentDto, MarketplaceFilters, AgentCategory, AgentSource } from '@bnb-marketplace/shared-types';
import { categoryFromSlug } from '../../core/utils/formatters';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [AgentCardComponent, AgentFiltersComponent],
  template: `
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div class="mb-8">
        <p class="label-terminal mb-3">// {{ t('marketplace.badge') }}</p>
        <h1 class="font-pixel text-2xl text-surface-950 sm:text-3xl">{{ pageTitle() }}</h1>
        @if (pageDescription()) {
          <p class="mt-3 max-w-2xl font-mono-data text-sm text-surface-500">{{ pageDescription() }}</p>
        }
      </div>

      <div class="grid gap-6 lg:grid-cols-4">
        <aside class="lg:col-span-1">
          <app-agent-filters
            [initialCategory]="initialCategory()"
            (filtersChange)="onFiltersChange($event)"
          />
        </aside>

        <main class="lg:col-span-3">
          @if (loading()) {
            <p class="font-mono-data text-sm text-surface-500">{{ t('home.loadingAgents') }}</p>
          } @else if (agents().length === 0) {
            <div class="card py-12 text-center">
              <p class="font-mono-data text-sm text-surface-500">{{ t('marketplace.empty') }}</p>
            </div>
          } @else {
            <p class="mb-4 font-mono-data text-xs uppercase tracking-wider text-surface-500">
              @if (agents().length < total()) {
                {{ t('marketplace.showing', { shown: agents().length, total: total() }) }}
              } @else {
                {{ t('marketplace.found', { count: total() }) }}
              }
            </p>
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              @for (agent of agents(); track agent.id) {
                <app-agent-card [agent]="agent" />
              }
            </div>
          }
        </main>
      </div>
    </div>
  `,
})
export class MarketplaceComponent implements OnInit {
  readonly agents = signal<MarketplaceAgentDto[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly initialCategory = signal<AgentCategory | undefined>(undefined);

  readonly t = inject(I18nService).t;

  private currentFilters: MarketplaceFilters = {
    source: AgentSource.ERC8004,
  };

  constructor(
    private readonly api: ApiService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      const slug = data['categorySlug'] as string | undefined;
      if (slug) {
        const category = categoryFromSlug(slug);
        if (category) {
          this.initialCategory.set(category);
          this.currentFilters = {
            ...this.currentFilters,
            category,
            source: AgentSource.ERC8004,
          };
        }
      }
      this.loadAgents();
    });
  }

  pageTitle(): string {
    const category = this.initialCategory();
    return category ? this.t('categoryName.' + category) : this.t('marketplace.title');
  }

  pageDescription(): string {
    const category = this.initialCategory();
    return category ? this.t('categoryDescription.' + category) : '';
  }

  onFiltersChange(filters: MarketplaceFilters): void {
    this.currentFilters = { ...this.currentFilters, ...filters };
    this.loadAgents();
  }

  private loadAgents(): void {
    this.loading.set(true);
    this.api.getMarketplaceAgents({ ...this.currentFilters, limit: 100, page: 1 }).subscribe({
      next: (res) => {
        this.agents.set(res.data);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

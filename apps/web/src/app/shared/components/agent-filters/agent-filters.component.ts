import { Component, Input, OnInit, inject, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  AgentCategory,
  AgentSource,
  ChainInfo,
  RiskLevel,
  MarketplaceSort,
  MarketplaceFilters,
} from '@bnb-marketplace/shared-types';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-agent-filters',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="card space-y-4">
      <p class="font-mono-data text-xs uppercase tracking-wider text-surface-500">{{ t('filters.exploreCategory') }}</p>
      <h3 class="font-mono-data text-sm font-medium text-surface-950">{{ t('filters.title') }}</h3>

      <form [formGroup]="form" class="space-y-3">
        <div>
          <label class="mb-1 block font-mono-data text-xs text-surface-500">{{ t('filters.environment') }}</label>
          <select formControlName="environment" class="select-field">
            <option value="">{{ t('filters.allNetworks') }}</option>
            <option value="mainnet">{{ t('filters.mainnet') }}</option>
            <option value="testnet">{{ t('filters.testnet') }}</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block font-mono-data text-xs text-surface-500">{{ t('filters.chain') }}</label>
          <select formControlName="chainId" class="select-field">
            <option value="">{{ t('filters.allChains') }}</option>
            @for (chain of chains(); track chain.chainId) {
              <option [value]="chain.chainId">
                {{ chain.name }} ({{ chain.agentCount }})
              </option>
            }
          </select>
        </div>

        <div>
          <label class="mb-1 block font-mono-data text-xs text-surface-500">{{ t('filters.search') }}</label>
          <input formControlName="search" type="text" [placeholder]="t('filters.searchPlaceholder')" class="input-field" />
        </div>

        <div>
          <label class="mb-1 block font-mono-data text-xs text-surface-500">{{ t('filters.category') }}</label>
          <select formControlName="category" class="select-field">
            <option value="">{{ t('filters.allCategories') }}</option>
            <option value="REBALANCING">{{ t('category.REBALANCING') }}</option>
            <option value="GRID_TRADING">{{ t('category.GRID_TRADING') }}</option>
            <option value="YIELD_OPTIMISATION">{{ t('category.YIELD_OPTIMISATION') }}</option>
            <option value="HEALTH_FACTOR_MONITORING">{{ t('category.HEALTH_FACTOR_MONITORING') }}</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block font-mono-data text-xs text-surface-500">{{ t('filters.protocol') }}</label>
          <select formControlName="protocol" class="select-field">
            <option value="">{{ t('filters.allProtocols') }}</option>
            <option value="PancakeSwap">PancakeSwap</option>
            <option value="Venus">Venus</option>
            <option value="Lista DAO">Lista DAO</option>
            <option value="Aave">Aave</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block font-mono-data text-xs text-surface-500">{{ t('filters.risk') }}</label>
          <select formControlName="riskLevel" class="select-field">
            <option value="">{{ t('filters.allRisks') }}</option>
            <option value="LOW">{{ t('risk.LOW') }}</option>
            <option value="MEDIUM">{{ t('risk.MEDIUM') }}</option>
            <option value="HIGH">{{ t('risk.HIGH') }}</option>
            <option value="VERY_HIGH">{{ t('risk.VERY_HIGH') }}</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block font-mono-data text-xs text-surface-500">{{ t('filters.asset') }}</label>
          <select formControlName="asset" class="select-field">
            <option value="">{{ t('filters.allAssets') }}</option>
            <option value="BNB">BNB</option>
            <option value="USDT">USDT</option>
            <option value="USDC">USDC</option>
            <option value="ETH">ETH</option>
            <option value="BTCB">BTCB</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block font-mono-data text-xs text-surface-500">{{ t('filters.capital') }}</label>
          <input formControlName="minimumCapital" type="number" [placeholder]="t('filters.capitalPlaceholder')" class="input-field" />
        </div>

        <div>
          <label class="mb-1 block font-mono-data text-xs text-surface-500">{{ t('filters.verified') }}</label>
          <select formControlName="verified" class="select-field">
            <option value="">{{ t('filters.all') }}</option>
            <option value="true">{{ t('filters.verifiedOnly') }}</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block font-mono-data text-xs text-surface-500">{{ t('filters.source') }}</label>
          <select formControlName="source" class="select-field">
            <option value="">{{ t('filters.allSources') }}</option>
            <option value="ERC8004">{{ t('filters.erc8004Only') }}</option>
            <option value="BNB_AGENT_STUDIO">{{ t('filters.studioOnly') }}</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block font-mono-data text-xs text-surface-500">{{ t('filters.sort') }}</label>
          <select formControlName="sort" class="select-field">
            <option value="">{{ t('filters.sortDefault') }}</option>
            <option value="highestReturn">{{ t('filters.sortHighestReturn') }}</option>
            <option value="lowestRisk">{{ t('filters.sortLowestRisk') }}</option>
            <option value="highestAum">{{ t('filters.sortHighestAum') }}</option>
            <option value="bestSuccessRate">{{ t('filters.sortBestSuccessRate') }}</option>
            <option value="mostUsed">{{ t('filters.sortMostUsed') }}</option>
            <option value="newest">{{ t('filters.sortNewest') }}</option>
          </select>
        </div>
      </form>
    </div>
  `,
})
export class AgentFiltersComponent implements OnInit {
  @Input() initialCategory?: AgentCategory;
  @Input() defaultEnvironment: 'mainnet' | 'testnet' | '' = '';

  readonly filtersChange = output<MarketplaceFilters>();
  readonly chains = signal<ChainInfo[]>([]);
  readonly t = inject(I18nService).t;

  form!: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
  ) {}

  ngOnInit(): void {
    this.api.getMarketplaceChains().subscribe({
      next: (chains) => this.chains.set(chains),
      error: () => this.chains.set([]),
    });

    this.form = this.fb.group({
      environment: [this.defaultEnvironment],
      chainId: [''],
      search: [''],
      category: [this.initialCategory ?? ''],
      protocol: [''],
      riskLevel: [''],
      asset: [''],
      minimumCapital: [''],
      verified: [''],
      source: ['ERC8004'],
      sort: [''],
    });

    this.form.valueChanges.subscribe((values) => {
      this.filtersChange.emit(this.buildFilters(values));
    });

    this.filtersChange.emit(this.buildFilters(this.form.value));
  }

  private buildFilters(values: Record<string, string>): MarketplaceFilters {
    const filters: MarketplaceFilters = { source: AgentSource.ERC8004 };

    if (values['search']) filters.search = values['search'];
    if (values['category']) filters.category = values['category'] as AgentCategory;
    if (values['protocol']) filters.protocol = values['protocol'];
    if (values['riskLevel']) filters.riskLevel = values['riskLevel'] as RiskLevel;
    if (values['asset']) filters.asset = values['asset'];
    if (values['minimumCapital']) filters.minimumCapital = Number(values['minimumCapital']);
    if (values['verified'] === 'true') filters.verified = true;
    if (values['source']) filters.source = values['source'] as AgentSource;
    if (values['sort']) filters.sort = values['sort'] as MarketplaceSort;
    if (values['chainId']) filters.chainId = Number(values['chainId']);
    if (values['environment'] === 'mainnet') filters.isTestnet = false;
    if (values['environment'] === 'testnet') filters.isTestnet = true;

    return filters;
  }
}

import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CompareStateService } from '../../../core/services/compare-state.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';
import { WalletConnectComponent } from '../wallet-connect/wallet-connect.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LanguageSwitcherComponent, WalletConnectComponent],
  template: `
    <header class="sticky top-0 z-50 border-b border-surface-300 bg-surface-50/90 backdrop-blur-md">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <a routerLink="/" class="flex items-center gap-2 no-underline">
          <span class="font-pixel text-lg text-brand-500 glow-accent">agent<span class="text-surface-950">market</span></span>
        </a>

        <nav class="hidden items-center gap-5 md:flex">
          <a routerLink="/agents" [routerLinkActiveOptions]="{ exact: true }" routerLinkActive="nav-link-active" class="nav-link">{{ t('nav.marketplace') }}</a>
          <a routerLink="/agents/rebalancing" routerLinkActive="nav-link-active" class="nav-link">{{ t('nav.rebalancing') }}</a>
          <a routerLink="/agents/grid-trading" routerLinkActive="nav-link-active" class="nav-link">{{ t('nav.gridTrading') }}</a>
          <a routerLink="/agents/yield" routerLinkActive="nav-link-active" class="nav-link">{{ t('nav.yield') }}</a>
          <a routerLink="/agents/health-factor" routerLinkActive="nav-link-active" class="nav-link">{{ t('nav.healthFactor') }}</a>
        </nav>

        <div class="flex items-center gap-2">
          <app-language-switcher />
          <app-wallet-connect />
          @if (compareState.count() > 0) {
            <a routerLink="/compare" class="btn-secondary !px-3 !py-1.5 text-xs">
              {{ t('nav.compare', { count: compareState.count() }) }}
            </a>
          }
          <a routerLink="/my-agents" class="btn-primary !px-3 !py-1.5 text-xs">{{ t('nav.myAgents') }}</a>
        </div>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  readonly compareState = inject(CompareStateService);
  readonly t = inject(I18nService).t;
}

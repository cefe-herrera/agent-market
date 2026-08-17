import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { UserService } from '../../core/services/user.service';
import { AgentHireDto } from '@bnb-marketplace/shared-types';
import { statusBadgeClass } from '../../core/utils/formatters';
import { I18nService } from '../../core/i18n/i18n.service';
import { WalletConnectComponent } from '../../shared/components/wallet-connect/wallet-connect.component';

@Component({
  selector: 'app-my-agents',
  standalone: true,
  imports: [RouterLink, WalletConnectComponent],
  template: `
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p class="label-terminal mb-3">// {{ t('myAgents.title') }}</p>
      <h1 class="mb-2 font-pixel text-2xl text-surface-950">{{ t('myAgents.title') }}</h1>
      <p class="mb-8 font-mono-data text-sm text-surface-500">{{ t('myAgents.subtitle') }}</p>

      @if (!userService.isConnected()) {
        <div class="card py-12 text-center">
          <p class="mb-4 font-mono-data text-sm text-surface-500">{{ t('wallet.connectPrompt') }}</p>
          <app-wallet-connect />
        </div>
      } @else if (loading()) {
        <p class="text-surface-500">{{ t('myAgents.loading') }}</p>
      } @else if (hires().length === 0) {
        <div class="card py-12 text-center">
          <p class="text-surface-500">{{ t('myAgents.empty') }}</p>
          <a routerLink="/agents" class="btn-primary mt-4 inline-block">{{ t('myAgents.browse') }}</a>
        </div>
      } @else {
        <div class="space-y-4">
          @for (hire of hires(); track hire.id) {
            <div class="card">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="font-mono-data text-sm font-medium text-surface-950">{{ hire.agent?.name ?? '—' }}</h3>
                    <span [class]="statusBadgeClass(hire.status)">{{ t('status.' + hire.status) }}</span>
                  </div>
                  @if (hire.agent) {
                    <p class="mt-1 text-sm text-surface-500">{{ t('category.' + hire.agent.category) }}</p>
                  }
                </div>
                <div class="flex gap-2">
                  @if (hire.agent) {
                    <a [routerLink]="['/agents', hire.agent.slug]" class="btn-secondary text-xs">{{ t('myAgents.view') }}</a>
                  }
                  @if (hire.status === 'ACTIVE') {
                    <button (click)="pauseHire(hire.id)" class="btn-secondary text-xs">{{ t('myAgents.pause') }}</button>
                  }
                  @if (hire.status !== 'REVOKED' && hire.status !== 'COMPLETED') {
                    <button (click)="revokeHire(hire.id)" class="btn-secondary text-xs !text-red-400">{{ t('myAgents.revoke') }}</button>
                  }
                </div>
              </div>

              <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
                <div>
                  <p class="text-xs text-surface-500">{{ t('myAgents.capital') }}</p>
                  <p class="font-medium">{{ hire.amount }} {{ hire.asset }}</p>
                </div>
                <div>
                  <p class="text-xs text-surface-500">{{ t('myAgents.activated') }}</p>
                  <p class="font-medium">{{ hire.activatedAt ? formatDate(hire.activatedAt) : '—' }}</p>
                </div>
                <div>
                  <p class="text-xs text-surface-500">{{ t('myAgents.status') }}</p>
                  <p class="font-medium">{{ t('status.' + hire.status) }}</p>
                </div>
                <div>
                  <p class="text-xs text-surface-500">{{ t('myAgents.hireId') }}</p>
                  <p class="font-mono text-xs">{{ hire.id.slice(0, 8) }}...</p>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class MyAgentsComponent implements OnInit {
  readonly hires = signal<AgentHireDto[]>([]);
  readonly loading = signal(true);

  private readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  readonly statusBadgeClass = statusBadgeClass;
  readonly userService = inject(UserService);

  constructor(
    private readonly api: ApiService,
  ) {}

  ngOnInit(): void {
    if (this.userService.isConnected()) {
      this.loadHires();
    } else {
      this.loading.set(false);
    }
  }

  loadHires(): void {
    const wallet = this.userService.wallet();
    if (!wallet) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.api.getUserHires(wallet).subscribe({
      next: (hires) => {
        this.hires.set(hires);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  pauseHire(id: string): void {
    this.api.pauseHire(id).subscribe(() => this.loadHires());
  }

  revokeHire(id: string): void {
    this.api.revokeHire(id).subscribe(() => this.loadHires());
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString(this.i18n.locale());
  }
}

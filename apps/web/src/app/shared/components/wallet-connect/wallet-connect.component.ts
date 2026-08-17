import { Component, inject } from '@angular/core';
import { WalletService } from '../../../core/wallet/wallet.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-wallet-connect',
  standalone: true,
  template: `
    @if (wallet.isConnected()) {
      <button
        type="button"
        class="btn-secondary !px-3 !py-1.5 font-mono-data text-xs"
        (click)="wallet.disconnect()"
        [title]="wallet.address() ?? ''"
      >
        {{ wallet.shortAddress() }}
      </button>
    } @else {
      <button
        type="button"
        class="btn-primary !px-3 !py-1.5 text-xs"
        (click)="connect()"
        [disabled]="wallet.isConnecting()"
      >
        {{ wallet.isConnecting() ? t('wallet.connecting') : t('wallet.connect') }}
      </button>
    }
  `,
})
export class WalletConnectComponent {
  readonly wallet = inject(WalletService);
  readonly t = inject(I18nService).t;

  connect(): void {
    void this.wallet.connect();
  }
}

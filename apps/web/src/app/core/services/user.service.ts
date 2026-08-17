import { Injectable, inject } from '@angular/core';
import { WalletService } from '../wallet/wallet.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly walletService = inject(WalletService);

  wallet(): string | null {
    return this.walletService.address();
  }

  isConnected(): boolean {
    return this.walletService.isConnected();
  }
}

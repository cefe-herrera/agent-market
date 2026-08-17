import { Injectable, computed, signal } from '@angular/core';
import type { Wallet } from 'thirdweb/wallets';
import { autoConnect, createWallet, walletConnect } from 'thirdweb/wallets';
import { appMetadata, defaultChain, thirdwebClient } from './thirdweb.client';

@Injectable({ providedIn: 'root' })
export class WalletService {
  private activeWallet: Wallet | null = null;

  readonly address = signal<string | null>(null);
  readonly isConnecting = signal(false);
  readonly isConnected = computed(() => !!this.address());

  readonly shortAddress = computed(() => {
    const addr = this.address();
    if (!addr) return '';
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  });

  /** Called on app bootstrap — restores last connected wallet if available */
  async tryAutoConnect(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      await autoConnect({
        client: thirdwebClient,
        chain: defaultChain,
        appMetadata,
        onConnect: (wallet) => this.bindWallet(wallet),
      });
    } catch {
      // No prior session or user rejected — ignore
    }
  }

  async connect(): Promise<void> {
    if (this.isConnecting()) return;

    this.isConnecting.set(true);
    try {
      const injected = createWallet('io.metamask');
      const account = await injected.connect({
        client: thirdwebClient,
        chain: defaultChain,
      });
      this.bindWallet(injected, account.address);
    } catch {
      try {
        const wc = walletConnect();
        const account = await wc.connect({
          client: thirdwebClient,
          chain: defaultChain,
          appMetadata,
          showQrModal: true,
        });
        this.bindWallet(wc, account.address);
      } catch {
        // User closed modal or rejected
      }
    } finally {
      this.isConnecting.set(false);
    }
  }

  async disconnect(): Promise<void> {
    if (this.activeWallet) {
      try {
        await this.activeWallet.disconnect();
      } catch {
        // ignore
      }
    }
    this.activeWallet = null;
    this.address.set(null);
  }

  private bindWallet(wallet: Wallet, explicitAddress?: string): void {
    this.activeWallet = wallet;
    const account = wallet.getAccount();
    const addr = explicitAddress ?? account?.address;
    if (addr) {
      this.address.set(addr);
    }
  }
}

import { ApplicationConfig, APP_INITIALIZER, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { WalletService } from './core/wallet/wallet.service';

function initWallet(wallet: WalletService): () => Promise<void> {
  return () => wallet.tryAutoConnect();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    {
      provide: APP_INITIALIZER,
      useFactory: initWallet,
      deps: [WalletService],
      multi: true,
    },
  ],
};

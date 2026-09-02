import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { bscChainId, parseNetworkMode, type NetworkMode } from './network-mode';

@Injectable()
export class NetworkConfig {
  private readonly logger = new Logger(NetworkConfig.name);
  readonly mode: NetworkMode;
  readonly isTestnet: boolean;
  readonly chainId: number;

  constructor(config: ConfigService) {
    this.mode = parseNetworkMode(config.get<string>('NETWORK'));
    this.isTestnet = this.mode === 'testnet';
    this.chainId = bscChainId(this.mode);
    this.logger.log(`8004scan network: ${this.mode} (BSC ${this.chainId})`);
  }
}

import { Global, Module } from '@nestjs/common';
import { NetworkConfig } from './network.config';

@Global()
@Module({
  providers: [NetworkConfig],
  exports: [NetworkConfig],
})
export class NetworkModule {}

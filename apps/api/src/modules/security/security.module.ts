import { Module } from '@nestjs/common';
import { SecurityService, SecurityPublicService } from './security-public.service';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [BlockchainModule],
  providers: [SecurityService, SecurityPublicService],
  exports: [SecurityService, SecurityPublicService],
})
export class SecurityModule {}

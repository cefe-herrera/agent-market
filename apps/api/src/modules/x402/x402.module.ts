import { Module } from '@nestjs/common';
import { X402Controller } from './x402.controller';
import { X402Service } from './x402.service';
import { FacilitatorClient } from './facilitator.client';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [AgentsModule],
  controllers: [X402Controller],
  providers: [X402Service, FacilitatorClient],
})
export class X402Module {}

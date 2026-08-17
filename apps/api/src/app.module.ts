import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AgentLookupModule } from './common/agents/agent-lookup.module';
import { EventsModule } from './common/events/events.module';
import { HealthModule } from './common/health/health.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { AgentsModule } from './modules/agents/agents.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SecurityModule } from './modules/security/security.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { HiringModule } from './modules/hiring/hiring.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    AgentLookupModule,
    EventsModule,
    HealthModule,
    AgentsModule,
    AnalyticsModule,
    SecurityModule,
    MarketplaceModule,
    HiringModule,
    BlockchainModule,
    UsersModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}

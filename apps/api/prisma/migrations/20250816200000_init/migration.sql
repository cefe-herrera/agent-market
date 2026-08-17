-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('DISCOVERED', 'LISTED', 'VERIFIED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AgentCategory" AS ENUM ('REBALANCING', 'GRID_TRADING', 'YIELD_OPTIMISATION', 'HEALTH_FACTOR_MONITORING');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "PermissionType" AS ENUM ('SWAP', 'TRANSFER', 'SUPPLY', 'WITHDRAW', 'BORROW', 'REPAY', 'ADD_LIQUIDITY', 'REMOVE_LIQUIDITY', 'REBALANCE');

-- CreateEnum
CREATE TYPE "HireStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'REVOKED', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "short_description" TEXT NOT NULL,
    "image_url" TEXT,
    "owner_wallet" TEXT NOT NULL,
    "agent_wallet" TEXT NOT NULL,
    "agent_uri" TEXT,
    "network" TEXT NOT NULL DEFAULT 'BNB Chain',
    "status" "AgentStatus" NOT NULL DEFAULT 'LISTED',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "category" "AgentCategory" NOT NULL,
    "protocols" TEXT[],
    "supported_assets" TEXT[],
    "strategy_name" TEXT NOT NULL,
    "strategy_description" TEXT NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "minimum_capital" DOUBLE PRECISION NOT NULL,
    "recommended_capital" DOUBLE PRECISION NOT NULL,
    "execution_frequency" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_metrics" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "aum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "managed_volume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_executions" INTEGER NOT NULL DEFAULT 0,
    "successful_executions" INTEGER NOT NULL DEFAULT 0,
    "failed_executions" INTEGER NOT NULL DEFAULT 0,
    "success_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "return_7d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "return_30d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "return_90d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "max_drawdown_30d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "average_execution_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "average_gas_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uptime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unique_users" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "category_metrics" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_permissions" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "permission_type" "PermissionType" NOT NULL,
    "contract_address" TEXT,
    "protocol" TEXT,
    "spend_limit" DOUBLE PRECISION,
    "spend_asset" TEXT,
    "expiration" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "agent_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_hires" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "user_wallet" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "asset" TEXT NOT NULL,
    "status" "HireStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "agent_hires_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_wallet_address_key" ON "users"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "agents_agent_id_key" ON "agents"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "agents_slug_key" ON "agents"("slug");

-- CreateIndex
CREATE INDEX "agents_category_idx" ON "agents"("category");

-- CreateIndex
CREATE INDEX "agents_risk_level_idx" ON "agents"("risk_level");

-- CreateIndex
CREATE INDEX "agents_verified_idx" ON "agents"("verified");

-- CreateIndex
CREATE UNIQUE INDEX "agent_metrics_agent_id_key" ON "agent_metrics"("agent_id");

-- CreateIndex
CREATE INDEX "agent_permissions_agent_id_idx" ON "agent_permissions"("agent_id");

-- CreateIndex
CREATE INDEX "agent_hires_user_wallet_idx" ON "agent_hires"("user_wallet");

-- CreateIndex
CREATE INDEX "agent_hires_agent_id_idx" ON "agent_hires"("agent_id");

-- AddForeignKey
ALTER TABLE "agent_metrics" ADD CONSTRAINT "agent_metrics_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_permissions" ADD CONSTRAINT "agent_permissions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_hires" ADD CONSTRAINT "agent_hires_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_hires" ADD CONSTRAINT "agent_hires_user_wallet_fkey" FOREIGN KEY ("user_wallet") REFERENCES "users"("wallet_address") ON DELETE RESTRICT ON UPDATE CASCADE;

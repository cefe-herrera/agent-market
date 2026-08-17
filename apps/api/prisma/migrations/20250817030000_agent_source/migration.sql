-- CreateEnum
CREATE TYPE "AgentSource" AS ENUM ('MARKETPLACE_SEED', 'BNB_AGENT_STUDIO');

-- AlterTable
ALTER TABLE "agents" ADD COLUMN "source" "AgentSource" NOT NULL DEFAULT 'MARKETPLACE_SEED';
ALTER TABLE "agents" ADD COLUMN "published_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "agents_source_idx" ON "agents"("source");

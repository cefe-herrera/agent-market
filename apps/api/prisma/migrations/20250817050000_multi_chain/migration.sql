-- AlterTable
ALTER TABLE "agents" ADD COLUMN "chain_id" INTEGER NOT NULL DEFAULT 56;
ALTER TABLE "agents" ADD COLUMN "is_testnet" BOOLEAN NOT NULL DEFAULT false;

-- Backfill chain_id from agent_id format: chainId:0x...:tokenId
UPDATE "agents"
SET "chain_id" = CAST(split_part("agent_id", ':', 1) AS INTEGER)
WHERE "agent_id" LIKE '%:%:%';

-- Backfill is_testnet for known testnet chains
UPDATE "agents"
SET "is_testnet" = true
WHERE "chain_id" IN (
  97, 103, 296, 998, 1439, 1946, 1952, 4201, 42431, 5003, 6343, 6913,
  9746, 10087, 10143, 10200, 11011, 11124, 11142220, 11155111, 11155420,
  167013, 421614, 43113, 5042002, 534351, 59141, 59902, 80002, 84532, 324705682
);

-- CreateIndex
CREATE INDEX "agents_chain_id_idx" ON "agents"("chain_id");
CREATE INDEX "agents_is_testnet_idx" ON "agents"("is_testnet");

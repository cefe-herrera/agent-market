-- AlterEnum (must run in its own migration before using the new value)
ALTER TYPE "AgentSource" ADD VALUE IF NOT EXISTS 'ERC8004';

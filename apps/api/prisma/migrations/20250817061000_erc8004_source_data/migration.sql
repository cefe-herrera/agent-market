-- Migrate legacy studio rows to ERC8004
UPDATE "agents" SET "source" = 'ERC8004' WHERE "source" = 'BNB_AGENT_STUDIO';

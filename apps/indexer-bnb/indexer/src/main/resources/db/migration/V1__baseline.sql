-- RAW (indexing)
CREATE TABLE indexer_checkpoint (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id        BIGINT NOT NULL UNIQUE,
    last_block      NUMERIC(78, 0) NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE indexed_blocks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id        BIGINT NOT NULL,
    block_number    NUMERIC(78, 0) NOT NULL,
    block_hash      VARCHAR(66) NOT NULL,
    parent_hash     VARCHAR(66) NOT NULL,
    indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (chain_id, block_number)
);

CREATE INDEX idx_indexed_blocks_chain_block ON indexed_blocks (chain_id, block_number DESC);

-- STATE
CREATE TABLE agents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id            BIGINT NOT NULL,
    onchain_id          NUMERIC(78, 0) NOT NULL,
    registry_address    VARCHAR(42) NOT NULL,
    owner_address       VARCHAR(42) NOT NULL,
    metadata_uri        TEXT,
    name                VARCHAR(255),
    description         TEXT,
    created_block       NUMERIC(78, 0) NOT NULL,
    transaction_hash    VARCHAR(66) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (chain_id, onchain_id)
);

CREATE INDEX idx_agents_owner ON agents (owner_address);
CREATE INDEX idx_agents_created_at ON agents (created_at DESC);

CREATE TABLE agent_metadata (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents (id) ON DELETE CASCADE,
    raw_json        JSONB,
    name            VARCHAR(255),
    description     TEXT,
    image_uri       TEXT,
    status          VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    fetched_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agent_id)
);

-- ACTIVITY (RAW -> STATE transition)
CREATE TABLE agent_activity (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id            UUID NOT NULL REFERENCES agents (id) ON DELETE CASCADE,
    activity_type       VARCHAR(64) NOT NULL,
    transaction_hash    VARCHAR(66) NOT NULL,
    block_number        NUMERIC(78, 0) NOT NULL,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_activity_agent ON agent_activity (agent_id, timestamp DESC);
CREATE INDEX idx_agent_activity_type ON agent_activity (activity_type);

-- DERIVED
CREATE TABLE agent_reputation (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents (id) ON DELETE CASCADE,
    score           DOUBLE PRECISION NOT NULL DEFAULT 0,
    factors         JSONB,
    calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agent_id)
);

CREATE TABLE agent_rankings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents (id) ON DELETE CASCADE,
    ranking_type    VARCHAR(32) NOT NULL,
    position        INTEGER NOT NULL,
    score           DOUBLE PRECISION NOT NULL,
    calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (ranking_type, agent_id)
);

CREATE INDEX idx_agent_rankings_type_position ON agent_rankings (ranking_type, position);

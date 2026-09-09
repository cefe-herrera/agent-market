-- On-chain metadata keys (e.g. agentWallet) from IdentityRegistry MetadataSet
CREATE TABLE agent_onchain_metadata (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id            UUID NOT NULL REFERENCES agents (id) ON DELETE CASCADE,
    metadata_key        VARCHAR(255) NOT NULL,
    metadata_value      BYTEA,
    block_number        NUMERIC(78, 0) NOT NULL,
    transaction_hash    VARCHAR(66) NOT NULL,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agent_id, metadata_key)
);

-- On-chain feedback from ReputationRegistry
CREATE TABLE agent_feedback (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id            UUID NOT NULL REFERENCES agents (id) ON DELETE CASCADE,
    chain_id            BIGINT NOT NULL,
    onchain_agent_id    NUMERIC(78, 0) NOT NULL,
    client_address      VARCHAR(42) NOT NULL,
    feedback_index      BIGINT NOT NULL,
    value               NUMERIC(78, 0) NOT NULL,
    value_decimals      SMALLINT NOT NULL DEFAULT 0,
    tag1                VARCHAR(255),
    tag2                VARCHAR(255),
    endpoint            TEXT,
    feedback_uri        TEXT,
    feedback_hash       VARCHAR(66),
    revoked             BOOLEAN NOT NULL DEFAULT FALSE,
    block_number        NUMERIC(78, 0) NOT NULL,
    transaction_hash    VARCHAR(66) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (chain_id, onchain_agent_id, client_address, feedback_index)
);

CREATE INDEX idx_agent_feedback_agent ON agent_feedback (agent_id, created_at DESC);

CREATE TABLE agent_feedback_responses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id         UUID NOT NULL REFERENCES agent_feedback (id) ON DELETE CASCADE,
    responder_address   VARCHAR(42) NOT NULL,
    response_uri        TEXT,
    response_hash       VARCHAR(66),
    block_number        NUMERIC(78, 0) NOT NULL,
    transaction_hash    VARCHAR(66) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_feedback_responses_feedback ON agent_feedback_responses (feedback_id);

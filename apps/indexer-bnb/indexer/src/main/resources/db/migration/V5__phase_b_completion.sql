-- Phase B completion: metadata retry, agent wallet, pending feedback, log dedup

ALTER TABLE agents
    ADD COLUMN agent_wallet_address VARCHAR(42);

ALTER TABLE agent_metadata
    ADD COLUMN retry_count INT NOT NULL DEFAULT 0,
    ADD COLUMN next_retry_at TIMESTAMPTZ;

CREATE TABLE pending_feedback (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    registry_address    VARCHAR(42) NOT NULL,
    block_number        NUMERIC(78, 0) NOT NULL,
    transaction_hash    VARCHAR(66) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (chain_id, onchain_agent_id, client_address, feedback_index)
);

CREATE INDEX idx_pending_feedback_agent ON pending_feedback (chain_id, onchain_agent_id);

CREATE TABLE processed_chain_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id            BIGINT NOT NULL,
    transaction_hash    VARCHAR(66) NOT NULL,
    log_index           INT NOT NULL,
    block_number        NUMERIC(78, 0) NOT NULL,
    processed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (chain_id, transaction_hash, log_index)
);

CREATE UNIQUE INDEX idx_agent_activity_dedup
    ON agent_activity (agent_id, activity_type, transaction_hash, block_number);

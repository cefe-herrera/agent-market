-- ValidationRegistry (ValidationRequest / ValidationResponse)
CREATE TABLE agent_validation_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id            UUID NOT NULL REFERENCES agents (id) ON DELETE CASCADE,
    chain_id            BIGINT NOT NULL,
    onchain_agent_id    NUMERIC(78, 0) NOT NULL,
    validator_address   VARCHAR(42) NOT NULL,
    request_hash        VARCHAR(66) NOT NULL,
    request_uri         TEXT,
    block_number        NUMERIC(78, 0) NOT NULL,
    transaction_hash    VARCHAR(66) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (chain_id, request_hash)
);

CREATE INDEX idx_agent_validation_requests_agent ON agent_validation_requests (agent_id, created_at DESC);

CREATE TABLE agent_validation_responses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id          UUID NOT NULL REFERENCES agent_validation_requests (id) ON DELETE CASCADE,
    validator_address   VARCHAR(42) NOT NULL,
    response            SMALLINT NOT NULL,
    response_uri        TEXT,
    response_hash       VARCHAR(66),
    tag                 VARCHAR(255) NOT NULL DEFAULT '',
    block_number        NUMERIC(78, 0) NOT NULL,
    transaction_hash    VARCHAR(66) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (request_id, tag)
);

CREATE INDEX idx_agent_validation_responses_request ON agent_validation_responses (request_id, created_at DESC);

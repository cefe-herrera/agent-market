-- Phase C: PostgreSQL full-text and trigram search over agents

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE agents
    ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(owner_address, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(agent_wallet_address, '')), 'C')
    ) STORED;

CREATE INDEX idx_agents_search_vector ON agents USING gin (search_vector);

CREATE INDEX idx_agents_name_trgm ON agents USING gin (name gin_trgm_ops);
CREATE INDEX idx_agents_description_trgm ON agents USING gin (description gin_trgm_ops);
CREATE INDEX idx_agents_owner_trgm ON agents USING gin (owner_address gin_trgm_ops);
CREATE INDEX idx_agents_wallet_trgm ON agents USING gin (agent_wallet_address gin_trgm_ops);

package agora3.indexer.validation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigInteger;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "agent_validation_requests")
public class AgentValidationRequest {

    @Id
    private UUID id;

    @Column(name = "agent_id", nullable = false)
    private UUID agentId;

    @Column(name = "chain_id", nullable = false)
    private Long chainId;

    @Column(name = "onchain_agent_id", nullable = false)
    private BigInteger onchainAgentId;

    @Column(name = "validator_address", nullable = false, length = 42)
    private String validatorAddress;

    @Column(name = "request_hash", nullable = false, length = 66)
    private String requestHash;

    @Column(name = "request_uri")
    private String requestUri;

    @Column(name = "block_number", nullable = false)
    private BigInteger blockNumber;

    @Column(name = "transaction_hash", nullable = false, length = 66)
    private String transactionHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AgentValidationRequest() {
    }

    public UUID getId() {
        return id;
    }

    public UUID getAgentId() {
        return agentId;
    }

    public String getValidatorAddress() {
        return validatorAddress;
    }

    public String getRequestHash() {
        return requestHash;
    }

    public String getRequestUri() {
        return requestUri;
    }

    public BigInteger getBlockNumber() {
        return blockNumber;
    }

    public String getTransactionHash() {
        return transactionHash;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public static AgentValidationRequest fromEvent(UUID agentId, agora3.indexer.common.event.ValidationRequestedEvent event) {
        AgentValidationRequest request = new AgentValidationRequest();
        request.id = UUID.randomUUID();
        request.agentId = agentId;
        request.chainId = event.chainId();
        request.onchainAgentId = event.agentId();
        request.validatorAddress = event.validatorAddress();
        request.requestHash = normalizeHash(event.requestHash());
        request.requestUri = event.requestUri();
        request.blockNumber = event.blockNumber();
        request.transactionHash = event.transactionHash();
        request.createdAt = Instant.now();
        return request;
    }

    private static String normalizeHash(String hash) {
        return hash == null ? null : hash.toLowerCase();
    }
}

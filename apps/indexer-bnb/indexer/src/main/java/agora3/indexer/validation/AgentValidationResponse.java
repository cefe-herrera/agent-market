package agora3.indexer.validation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigInteger;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "agent_validation_responses")
public class AgentValidationResponse {

    @Id
    private UUID id;

    @Column(name = "request_id", nullable = false)
    private UUID requestId;

    @Column(name = "validator_address", nullable = false, length = 42)
    private String validatorAddress;

    @Column(nullable = false, columnDefinition = "SMALLINT")
    private short response;

    @Column(name = "response_uri")
    private String responseUri;

    @Column(name = "response_hash", length = 66)
    private String responseHash;

    @Column(nullable = false)
    private String tag;

    @Column(name = "block_number", nullable = false)
    private BigInteger blockNumber;

    @Column(name = "transaction_hash", nullable = false, length = 66)
    private String transactionHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AgentValidationResponse() {
    }

    public UUID getId() {
        return id;
    }

    public UUID getRequestId() {
        return requestId;
    }

    public String getValidatorAddress() {
        return validatorAddress;
    }

    public int getResponse() {
        return response;
    }

    public String getResponseUri() {
        return responseUri;
    }

    public String getResponseHash() {
        return responseHash;
    }

    public String getTag() {
        return tag;
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

    public static AgentValidationResponse fromEvent(
            UUID requestId,
            agora3.indexer.common.event.ValidationRespondedEvent event
    ) {
        AgentValidationResponse response = new AgentValidationResponse();
        response.id = UUID.randomUUID();
        response.requestId = requestId;
        response.validatorAddress = event.validatorAddress();
        response.response = (short) event.response();
        response.responseUri = event.responseUri();
        response.responseHash = event.responseHash();
        response.tag = event.tag() == null ? "" : event.tag();
        response.blockNumber = event.blockNumber();
        response.transactionHash = event.transactionHash();
        response.createdAt = Instant.now();
        return response;
    }
}

package agora3.indexer.reputation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigInteger;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "agent_feedback")
public class AgentFeedback {

    @Id
    private UUID id;

    @Column(name = "agent_id", nullable = false)
    private UUID agentId;

    @Column(name = "chain_id", nullable = false)
    private Long chainId;

    @Column(name = "onchain_agent_id", nullable = false)
    private BigInteger onchainAgentId;

    @Column(name = "client_address", nullable = false, length = 42)
    private String clientAddress;

    @Column(name = "feedback_index", nullable = false)
    private long feedbackIndex;

    @Column(nullable = false)
    private BigInteger value;

    @Column(name = "value_decimals", nullable = false, columnDefinition = "SMALLINT")
    private short valueDecimals;

    private String tag1;

    private String tag2;

    private String endpoint;

    @Column(name = "feedback_uri")
    private String feedbackUri;

    @Column(name = "feedback_hash", length = 66)
    private String feedbackHash;

    @Column(nullable = false)
    private boolean revoked;

    @Column(name = "block_number", nullable = false)
    private BigInteger blockNumber;

    @Column(name = "transaction_hash", nullable = false, length = 66)
    private String transactionHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AgentFeedback() {
    }

    public UUID getId() {
        return id;
    }

    public UUID getAgentId() {
        return agentId;
    }

    public String getClientAddress() {
        return clientAddress;
    }

    public long getFeedbackIndex() {
        return feedbackIndex;
    }

    public String getTag1() {
        return tag1;
    }

    public String getTag2() {
        return tag2;
    }

    public String getEndpoint() {
        return endpoint;
    }

    public String getFeedbackUri() {
        return feedbackUri;
    }

    public String getFeedbackHash() {
        return feedbackHash;
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

    public BigInteger getValue() {
        return value;
    }

    public int getValueDecimals() {
        return valueDecimals;
    }

    public boolean isRevoked() {
        return revoked;
    }

    public double normalizedValue() {
        if (valueDecimals <= 0) {
            return value.doubleValue();
        }
        return value.doubleValue() / Math.pow(10, valueDecimals);
    }

    public void revoke() {
        this.revoked = true;
    }

    public static AgentFeedback fromEvent(
            UUID agentId,
            agora3.indexer.common.event.FeedbackReceivedEvent event
    ) {
        AgentFeedback feedback = new AgentFeedback();
        feedback.id = UUID.randomUUID();
        feedback.agentId = agentId;
        feedback.chainId = event.chainId();
        feedback.onchainAgentId = event.agentId();
        feedback.clientAddress = event.clientAddress();
        feedback.feedbackIndex = event.feedbackIndex();
        feedback.value = event.value();
        feedback.valueDecimals = (short) event.valueDecimals();
        feedback.tag1 = event.tag1();
        feedback.tag2 = event.tag2();
        feedback.endpoint = event.endpoint();
        feedback.feedbackUri = event.feedbackUri();
        feedback.feedbackHash = event.feedbackHash();
        feedback.revoked = false;
        feedback.blockNumber = event.blockNumber();
        feedback.transactionHash = event.transactionHash();
        feedback.createdAt = Instant.now();
        return feedback;
    }
}

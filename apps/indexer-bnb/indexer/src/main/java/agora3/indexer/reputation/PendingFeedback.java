package agora3.indexer.reputation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigInteger;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "pending_feedback")
public class PendingFeedback {

    @Id
    private UUID id;

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

    @Column(name = "registry_address", nullable = false, length = 42)
    private String registryAddress;

    @Column(name = "block_number", nullable = false)
    private BigInteger blockNumber;

    @Column(name = "transaction_hash", nullable = false, length = 66)
    private String transactionHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected PendingFeedback() {
    }

    public static PendingFeedback fromEvent(agora3.indexer.common.event.FeedbackReceivedEvent event) {
        PendingFeedback pending = new PendingFeedback();
        pending.id = UUID.randomUUID();
        pending.chainId = event.chainId();
        pending.onchainAgentId = event.agentId();
        pending.clientAddress = event.clientAddress();
        pending.feedbackIndex = event.feedbackIndex();
        pending.value = event.value();
        pending.valueDecimals = (short) event.valueDecimals();
        pending.tag1 = event.tag1();
        pending.tag2 = event.tag2();
        pending.endpoint = event.endpoint();
        pending.feedbackUri = event.feedbackUri();
        pending.feedbackHash = event.feedbackHash();
        pending.registryAddress = event.registryAddress();
        pending.blockNumber = event.blockNumber();
        pending.transactionHash = event.transactionHash();
        pending.createdAt = Instant.now();
        return pending;
    }

    public Long getChainId() {
        return chainId;
    }

    public BigInteger getOnchainAgentId() {
        return onchainAgentId;
    }

    public String getClientAddress() {
        return clientAddress;
    }

    public long getFeedbackIndex() {
        return feedbackIndex;
    }

    public BigInteger getValue() {
        return value;
    }

    public short getValueDecimals() {
        return valueDecimals;
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

    public String getRegistryAddress() {
        return registryAddress;
    }

    public BigInteger getBlockNumber() {
        return blockNumber;
    }

    public String getTransactionHash() {
        return transactionHash;
    }
}

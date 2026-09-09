package agora3.indexer.activity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigInteger;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "agent_activity")
public class AgentActivity {

    @Id
    private UUID id;

    @Column(name = "agent_id", nullable = false)
    private UUID agentId;

    @Column(name = "activity_type", nullable = false, length = 64)
    private String activityType;

    @Column(name = "transaction_hash", nullable = false, length = 66)
    private String transactionHash;

    @Column(name = "block_number", nullable = false)
    private BigInteger blockNumber;

    @Column(nullable = false)
    private Instant timestamp;

    protected AgentActivity() {
    }

    public static AgentActivity registered(
            UUID agentId,
            String transactionHash,
            BigInteger blockNumber,
            Instant timestamp
    ) {
        return of(agentId, "REGISTERED", transactionHash, blockNumber, timestamp);
    }

    public static AgentActivity uriUpdated(
            UUID agentId,
            String transactionHash,
            BigInteger blockNumber,
            Instant timestamp
    ) {
        return of(agentId, "URI_UPDATED", transactionHash, blockNumber, timestamp);
    }

    public static AgentActivity transferred(
            UUID agentId,
            String transactionHash,
            BigInteger blockNumber,
            Instant timestamp
    ) {
        return of(agentId, "TRANSFERRED", transactionHash, blockNumber, timestamp);
    }

    public static AgentActivity feedbackReceived(
            UUID agentId,
            String transactionHash,
            BigInteger blockNumber,
            Instant timestamp
    ) {
        return of(agentId, "FEEDBACK_RECEIVED", transactionHash, blockNumber, timestamp);
    }

    public static AgentActivity validationResponse(
            UUID agentId,
            String transactionHash,
            BigInteger blockNumber,
            Instant timestamp
    ) {
        return of(agentId, "VALIDATION_RESPONSE", transactionHash, blockNumber, timestamp);
    }

    private static AgentActivity of(
            UUID agentId,
            String activityType,
            String transactionHash,
            BigInteger blockNumber,
            Instant timestamp
    ) {
        AgentActivity activity = new AgentActivity();
        activity.id = UUID.randomUUID();
        activity.agentId = agentId;
        activity.activityType = activityType;
        activity.transactionHash = transactionHash;
        activity.blockNumber = blockNumber;
        activity.timestamp = timestamp;
        return activity;
    }

    public UUID getId() {
        return id;
    }

    public UUID getAgentId() {
        return agentId;
    }

    public String getActivityType() {
        return activityType;
    }

    public String getTransactionHash() {
        return transactionHash;
    }

    public BigInteger getBlockNumber() {
        return blockNumber;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
}

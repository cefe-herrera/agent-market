package agora3.indexer.metadata;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigInteger;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "agent_onchain_metadata")
public class AgentOnchainMetadata {

    @Id
    private UUID id;

    @Column(name = "agent_id", nullable = false)
    private UUID agentId;

    @Column(name = "metadata_key", nullable = false)
    private String metadataKey;

    @Column(name = "metadata_value")
    private byte[] metadataValue;

    @Column(name = "block_number", nullable = false)
    private BigInteger blockNumber;

    @Column(name = "transaction_hash", nullable = false, length = 66)
    private String transactionHash;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AgentOnchainMetadata() {
    }

    public UUID getId() {
        return id;
    }

    public UUID getAgentId() {
        return agentId;
    }

    public String getMetadataKey() {
        return metadataKey;
    }

    public byte[] getMetadataValue() {
        return metadataValue;
    }

    public void apply(
            byte[] metadataValue,
            java.math.BigInteger blockNumber,
            String transactionHash
    ) {
        this.metadataValue = metadataValue;
        this.blockNumber = blockNumber;
        this.transactionHash = transactionHash;
        this.updatedAt = Instant.now();
    }

    public static AgentOnchainMetadata of(
            UUID agentId,
            String metadataKey,
            byte[] metadataValue,
            BigInteger blockNumber,
            String transactionHash
    ) {
        AgentOnchainMetadata metadata = new AgentOnchainMetadata();
        metadata.id = UUID.randomUUID();
        metadata.agentId = agentId;
        metadata.metadataKey = metadataKey;
        metadata.metadataValue = metadataValue;
        metadata.blockNumber = blockNumber;
        metadata.transactionHash = transactionHash;
        metadata.updatedAt = Instant.now();
        return metadata;
    }
}

package agora3.indexer.agents;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigInteger;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "agents")
public class Agent {

    @Id
    private UUID id;

    @Column(name = "chain_id", nullable = false)
    private Long chainId;

    @Column(name = "onchain_id", nullable = false)
    private BigInteger onchainId;

    @Column(name = "registry_address", nullable = false, length = 42)
    private String registryAddress;

    @Column(name = "owner_address", nullable = false, length = 42)
    private String ownerAddress;

    @Column(name = "agent_wallet_address", length = 42)
    private String agentWalletAddress;

    @Column(name = "metadata_uri")
    private String metadataUri;

    private String name;

    private String description;

    @Column(name = "created_block", nullable = false)
    private BigInteger createdBlock;

    @Column(name = "transaction_hash", nullable = false, length = 66)
    private String transactionHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Agent() {
    }

    public UUID getId() {
        return id;
    }

    public Long getChainId() {
        return chainId;
    }

    public BigInteger getOnchainId() {
        return onchainId;
    }

    public String getRegistryAddress() {
        return registryAddress;
    }

    public String getOwnerAddress() {
        return ownerAddress;
    }

    public String getAgentWalletAddress() {
        return agentWalletAddress;
    }

    public void setAgentWalletAddress(String agentWalletAddress) {
        this.agentWalletAddress = agentWalletAddress;
    }

    public String getMetadataUri() {
        return metadataUri;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setMetadataUri(String metadataUri) {
        this.metadataUri = metadataUri;
    }

    public void setOwnerAddress(String ownerAddress) {
        this.ownerAddress = ownerAddress;
    }

    public BigInteger getCreatedBlock() {
        return createdBlock;
    }

    public String getTransactionHash() {
        return transactionHash;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public static Agent fromRegistration(
            agora3.indexer.common.event.AgentRegisteredEvent event
    ) {
        Agent agent = new Agent();
        agent.id = UUID.randomUUID();
        agent.chainId = event.chainId();
        agent.onchainId = event.agentId();
        agent.registryAddress = event.registryAddress();
        agent.ownerAddress = event.owner();
        agent.metadataUri = event.metadataUri();
        agent.createdBlock = event.blockNumber();
        agent.transactionHash = event.transactionHash();
        agent.createdAt = event.timestamp();
        return agent;
    }
}

package agora3.indexer.api.dto;

import agora3.indexer.agents.Agent;
import agora3.indexer.metadata.AgentMetadata;

import java.math.BigInteger;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record AgentDetailResponse(
        UUID id,
        Long chainId,
        BigInteger onchainId,
        String ownerAddress,
        String agentWalletAddress,
        String name,
        String description,
        String metadataUri,
        String imageUri,
        Map<String, Object> metadata,
        Instant createdAt
) {

    public static AgentDetailResponse from(Agent agent, AgentMetadata metadata) {
        return new AgentDetailResponse(
                agent.getId(),
                agent.getChainId(),
                agent.getOnchainId(),
                agent.getOwnerAddress(),
                agent.getAgentWalletAddress(),
                agent.getName(),
                agent.getDescription(),
                agent.getMetadataUri(),
                metadata != null ? metadata.getImageUri() : null,
                metadata != null ? metadata.getRawJson() : null,
                agent.getCreatedAt()
        );
    }
}

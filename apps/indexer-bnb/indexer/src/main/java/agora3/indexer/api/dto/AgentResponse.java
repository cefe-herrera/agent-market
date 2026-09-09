package agora3.indexer.api.dto;

import agora3.indexer.agents.Agent;

import java.math.BigInteger;
import java.time.Instant;
import java.util.UUID;

public record AgentResponse(
        UUID id,
        Long chainId,
        BigInteger onchainId,
        String ownerAddress,
        String name,
        String description,
        String metadataUri,
        Instant createdAt
) {

    public static AgentResponse from(Agent agent) {
        return new AgentResponse(
                agent.getId(),
                agent.getChainId(),
                agent.getOnchainId(),
                agent.getOwnerAddress(),
                agent.getName(),
                agent.getDescription(),
                agent.getMetadataUri(),
                agent.getCreatedAt()
        );
    }
}

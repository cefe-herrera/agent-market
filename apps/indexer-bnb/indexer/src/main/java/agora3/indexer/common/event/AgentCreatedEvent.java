package agora3.indexer.common.event;

import java.math.BigInteger;
import java.util.UUID;

public record AgentCreatedEvent(
        UUID agentId,
        Long chainId,
        BigInteger onchainAgentId,
        String metadataUri,
        BigInteger blockNumber,
        String transactionHash
) {
}

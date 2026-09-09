package agora3.indexer.common.event;

import java.math.BigInteger;

public record AgentMetadataSetEvent(
        Long chainId,
        BigInteger agentId,
        String metadataKey,
        byte[] metadataValue,
        String registryAddress,
        BigInteger blockNumber,
        String transactionHash
) {
}

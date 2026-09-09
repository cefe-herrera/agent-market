package agora3.indexer.common.event;

import java.math.BigInteger;

public record AgentUriUpdatedEvent(
        Long chainId,
        BigInteger agentId,
        String newUri,
        String updatedBy,
        String registryAddress,
        BigInteger blockNumber,
        String transactionHash
) {
}

package agora3.indexer.common.event;

import java.math.BigInteger;
import java.time.Instant;
import java.util.UUID;

public record AgentRegisteredEvent(
        Long chainId,
        BigInteger agentId,
        String owner,
        String metadataUri,
        String registryAddress,
        BigInteger blockNumber,
        String transactionHash,
        Instant timestamp
) {
}

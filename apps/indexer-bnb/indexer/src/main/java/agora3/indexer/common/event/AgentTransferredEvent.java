package agora3.indexer.common.event;

import java.math.BigInteger;

public record AgentTransferredEvent(
        Long chainId,
        BigInteger agentId,
        String fromAddress,
        String toAddress,
        String registryAddress,
        BigInteger blockNumber,
        String transactionHash
) {
}

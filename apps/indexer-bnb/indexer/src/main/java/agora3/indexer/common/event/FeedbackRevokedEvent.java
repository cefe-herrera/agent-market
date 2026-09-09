package agora3.indexer.common.event;

import java.math.BigInteger;

public record FeedbackRevokedEvent(
        Long chainId,
        BigInteger agentId,
        String clientAddress,
        long feedbackIndex,
        String registryAddress,
        BigInteger blockNumber,
        String transactionHash
) {
}

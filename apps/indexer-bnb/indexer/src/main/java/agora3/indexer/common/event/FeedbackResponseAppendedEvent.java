package agora3.indexer.common.event;

import java.math.BigInteger;

public record FeedbackResponseAppendedEvent(
        Long chainId,
        BigInteger agentId,
        String clientAddress,
        long feedbackIndex,
        String responderAddress,
        String responseUri,
        String responseHash,
        String registryAddress,
        BigInteger blockNumber,
        String transactionHash
) {
}

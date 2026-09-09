package agora3.indexer.common.event;

import java.math.BigInteger;

public record FeedbackReceivedEvent(
        Long chainId,
        BigInteger agentId,
        String clientAddress,
        long feedbackIndex,
        BigInteger value,
        int valueDecimals,
        String tag1,
        String tag2,
        String endpoint,
        String feedbackUri,
        String feedbackHash,
        String registryAddress,
        BigInteger blockNumber,
        String transactionHash
) {
}

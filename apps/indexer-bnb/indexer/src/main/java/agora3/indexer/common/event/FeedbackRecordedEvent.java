package agora3.indexer.common.event;

import java.math.BigInteger;
import java.util.UUID;

public record FeedbackRecordedEvent(
        UUID agentId,
        String clientAddress,
        long feedbackIndex,
        BigInteger blockNumber,
        String transactionHash
) {
}

package agora3.indexer.api.dto;

import agora3.indexer.reputation.AgentFeedback;

import java.math.BigInteger;
import java.time.Instant;
import java.util.UUID;

public record FeedbackResponse(
        UUID id,
        String clientAddress,
        long feedbackIndex,
        double normalizedValue,
        int valueDecimals,
        String tag1,
        String tag2,
        String endpoint,
        String feedbackUri,
        String feedbackHash,
        boolean revoked,
        BigInteger blockNumber,
        String transactionHash,
        Instant createdAt
) {

    public static FeedbackResponse from(AgentFeedback feedback) {
        return new FeedbackResponse(
                feedback.getId(),
                feedback.getClientAddress(),
                feedback.getFeedbackIndex(),
                feedback.normalizedValue(),
                feedback.getValueDecimals(),
                feedback.getTag1(),
                feedback.getTag2(),
                feedback.getEndpoint(),
                feedback.getFeedbackUri(),
                feedback.getFeedbackHash(),
                feedback.isRevoked(),
                feedback.getBlockNumber(),
                feedback.getTransactionHash(),
                feedback.getCreatedAt()
        );
    }
}

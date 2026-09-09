package agora3.indexer.api.dto;

import agora3.indexer.activity.AgentActivity;

import java.math.BigInteger;
import java.time.Instant;
import java.util.UUID;

public record ActivityResponse(
        UUID id,
        UUID agentId,
        String activityType,
        String transactionHash,
        BigInteger blockNumber,
        Instant timestamp
) {

    public static ActivityResponse from(AgentActivity activity) {
        return new ActivityResponse(
                activity.getId(),
                activity.getAgentId(),
                activity.getActivityType(),
                activity.getTransactionHash(),
                activity.getBlockNumber(),
                activity.getTimestamp()
        );
    }
}

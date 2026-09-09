package agora3.indexer.api.dto;

import agora3.indexer.reputation.AgentReputation;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record ReputationResponse(
        UUID agentId,
        double score,
        Map<String, Object> factors,
        Instant calculatedAt
) {

    public static ReputationResponse from(AgentReputation reputation) {
        return new ReputationResponse(
                reputation.getAgentId(),
                reputation.getScore(),
                reputation.getFactors(),
                reputation.getCalculatedAt()
        );
    }

    public static ReputationResponse empty(UUID agentId) {
        return new ReputationResponse(agentId, 0.0, Map.of(), null);
    }
}

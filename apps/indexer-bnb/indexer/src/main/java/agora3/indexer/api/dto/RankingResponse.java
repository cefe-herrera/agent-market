package agora3.indexer.api.dto;

import agora3.indexer.ranking.AgentRanking;
import agora3.indexer.ranking.RankingType;

import java.time.Instant;
import java.util.UUID;

public record RankingResponse(
        UUID agentId,
        RankingType rankingType,
        int position,
        double score,
        Instant calculatedAt
) {

    public static RankingResponse from(AgentRanking ranking) {
        return new RankingResponse(
                ranking.getAgentId(),
                ranking.getRankingType(),
                ranking.getPosition(),
                ranking.getScore(),
                ranking.getCalculatedAt()
        );
    }
}

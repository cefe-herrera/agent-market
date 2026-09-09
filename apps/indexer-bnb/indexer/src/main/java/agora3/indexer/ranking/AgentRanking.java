package agora3.indexer.ranking;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "agent_rankings")
public class AgentRanking {

    @Id
    private UUID id;

    @Column(name = "agent_id", nullable = false)
    private UUID agentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "ranking_type", nullable = false, length = 32)
    private RankingType rankingType;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false)
    private double score;

    @Column(name = "calculated_at", nullable = false)
    private Instant calculatedAt;

    protected AgentRanking() {
    }

    public static AgentRanking of(
            UUID agentId,
            RankingType rankingType,
            int position,
            double score
    ) {
        AgentRanking ranking = new AgentRanking();
        ranking.id = UUID.randomUUID();
        ranking.agentId = agentId;
        ranking.rankingType = rankingType;
        ranking.position = position;
        ranking.score = score;
        ranking.calculatedAt = Instant.now();
        return ranking;
    }

    public UUID getId() {
        return id;
    }

    public UUID getAgentId() {
        return agentId;
    }

    public RankingType getRankingType() {
        return rankingType;
    }

    public int getPosition() {
        return position;
    }

    public double getScore() {
        return score;
    }

    public Instant getCalculatedAt() {
        return calculatedAt;
    }
}

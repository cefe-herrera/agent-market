package agora3.indexer.reputation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "agent_reputation")
public class AgentReputation {

    @Id
    private UUID id;

    @Column(name = "agent_id", nullable = false, unique = true)
    private UUID agentId;

    @Column(nullable = false)
    private double score;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> factors;

    @Column(name = "calculated_at", nullable = false)
    private Instant calculatedAt;

    protected AgentReputation() {
    }

    public UUID getId() {
        return id;
    }

    public UUID getAgentId() {
        return agentId;
    }

    public double getScore() {
        return score;
    }

    public void setScore(double score) {
        this.score = score;
    }

    public Map<String, Object> getFactors() {
        return factors;
    }

    public void setFactors(Map<String, Object> factors) {
        this.factors = factors;
    }

    public Instant getCalculatedAt() {
        return calculatedAt;
    }

    public void setCalculatedAt(Instant calculatedAt) {
        this.calculatedAt = calculatedAt;
    }

    public static AgentReputation forAgent(UUID agentId) {
        AgentReputation reputation = new AgentReputation();
        reputation.id = UUID.randomUUID();
        reputation.agentId = agentId;
        reputation.calculatedAt = Instant.now();
        return reputation;
    }
}

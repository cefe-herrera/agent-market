package agora3.indexer.reputation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AgentReputationRepository extends JpaRepository<AgentReputation, UUID> {

    Optional<AgentReputation> findByAgentId(UUID agentId);

    List<AgentReputation> findAllByOrderByScoreDesc();
}

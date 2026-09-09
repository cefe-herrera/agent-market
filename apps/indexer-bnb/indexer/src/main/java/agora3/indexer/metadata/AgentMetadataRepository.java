package agora3.indexer.metadata;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AgentMetadataRepository extends JpaRepository<AgentMetadata, UUID> {

    Optional<AgentMetadata> findByAgentId(UUID agentId);

    @Query("""
            select m from AgentMetadata m
            where m.status in ('RETRY', 'FAILED')
              and m.nextRetryAt is not null
              and m.nextRetryAt <= :now
            """)
    List<AgentMetadata> findDueForRetry(@Param("now") Instant now);
}

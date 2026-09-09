package agora3.indexer.validation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigInteger;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AgentValidationResponseRepository extends JpaRepository<AgentValidationResponse, UUID> {

    Optional<AgentValidationResponse> findByRequestIdAndTag(UUID requestId, String tag);

    List<AgentValidationResponse> findByRequestIdOrderByCreatedAtDesc(UUID requestId);

    @Query("""
            select r from AgentValidationResponse r
            join AgentValidationRequest q on r.requestId = q.id
            where q.agentId = :agentId
            """)
    List<AgentValidationResponse> findByAgentId(@Param("agentId") UUID agentId);

    @Modifying
    @Query("delete from AgentValidationResponse r where r.blockNumber >= :fromBlock")
    void deleteFromBlock(@Param("fromBlock") BigInteger fromBlock);
}

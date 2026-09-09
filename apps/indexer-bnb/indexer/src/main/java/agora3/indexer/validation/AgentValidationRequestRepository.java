package agora3.indexer.validation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigInteger;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AgentValidationRequestRepository extends JpaRepository<AgentValidationRequest, UUID> {

    Optional<AgentValidationRequest> findByChainIdAndRequestHash(Long chainId, String requestHash);

    List<AgentValidationRequest> findByAgentIdOrderByCreatedAtDesc(UUID agentId);

    @Modifying
    @Query("delete from AgentValidationRequest r where r.chainId = :chainId and r.blockNumber >= :fromBlock")
    void deleteByChainIdAndBlockNumberGreaterThanEqual(
            @Param("chainId") Long chainId,
            @Param("fromBlock") BigInteger fromBlock
    );
}

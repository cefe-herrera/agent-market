package agora3.indexer.reputation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigInteger;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AgentFeedbackRepository extends JpaRepository<AgentFeedback, UUID> {

    Optional<AgentFeedback> findByChainIdAndOnchainAgentIdAndClientAddressAndFeedbackIndex(
            Long chainId,
            java.math.BigInteger onchainAgentId,
            String clientAddress,
            long feedbackIndex
    );

    List<AgentFeedback> findByAgentIdAndRevokedFalse(UUID agentId);

    List<AgentFeedback> findByAgentIdOrderByCreatedAtDesc(UUID agentId);

    long countByAgentIdAndRevokedFalse(UUID agentId);

    @Modifying
    @Query("delete from AgentFeedback f where f.chainId = :chainId and f.blockNumber >= :fromBlock")
    void deleteByChainIdAndBlockNumberGreaterThanEqual(
            @Param("chainId") Long chainId,
            @Param("fromBlock") BigInteger fromBlock
    );
}

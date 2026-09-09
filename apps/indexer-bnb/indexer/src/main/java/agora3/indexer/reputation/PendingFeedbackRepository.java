package agora3.indexer.reputation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigInteger;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PendingFeedbackRepository extends JpaRepository<PendingFeedback, UUID> {

    List<PendingFeedback> findByChainIdAndOnchainAgentId(Long chainId, BigInteger onchainAgentId);

    Optional<PendingFeedback> findByChainIdAndOnchainAgentIdAndClientAddressAndFeedbackIndex(
            Long chainId,
            BigInteger onchainAgentId,
            String clientAddress,
            long feedbackIndex
    );

    @Modifying
    @Query("delete from PendingFeedback p where p.chainId = :chainId and p.blockNumber >= :fromBlock")
    void deleteByChainIdAndBlockNumberGreaterThanEqual(
            @Param("chainId") Long chainId,
            @Param("fromBlock") BigInteger fromBlock
    );
}

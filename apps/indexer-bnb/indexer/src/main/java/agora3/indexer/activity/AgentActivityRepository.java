package agora3.indexer.activity;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigInteger;
import java.util.List;
import java.util.UUID;

public interface AgentActivityRepository extends JpaRepository<AgentActivity, UUID> {

    long countByAgentId(UUID agentId);

    List<AgentActivity> findByAgentIdOrderByTimestampDesc(UUID agentId);

    Page<AgentActivity> findByAgentIdOrderByTimestampDesc(UUID agentId, Pageable pageable);

    boolean existsByAgentIdAndActivityTypeAndTransactionHashAndBlockNumber(
            UUID agentId,
            String activityType,
            String transactionHash,
            BigInteger blockNumber
    );

    @Query("select count(a) from AgentActivity a where a.timestamp >= :since")
    long countSince(@Param("since") java.time.Instant since);

    @Modifying
    @Query("delete from AgentActivity a where a.blockNumber >= :fromBlock")
    void deleteFromBlock(@Param("fromBlock") BigInteger fromBlock);
}

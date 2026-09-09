package agora3.indexer.reputation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigInteger;
import java.util.UUID;

public interface AgentFeedbackResponseRepository extends JpaRepository<AgentFeedbackResponse, UUID> {

    @Modifying
    @Query("delete from AgentFeedbackResponse r where r.blockNumber >= :fromBlock")
    void deleteFromBlock(@Param("fromBlock") BigInteger fromBlock);
}

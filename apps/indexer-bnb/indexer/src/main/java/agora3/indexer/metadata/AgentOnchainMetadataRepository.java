package agora3.indexer.metadata;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigInteger;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AgentOnchainMetadataRepository extends JpaRepository<AgentOnchainMetadata, UUID> {

    Optional<AgentOnchainMetadata> findByAgentIdAndMetadataKey(UUID agentId, String metadataKey);

    List<AgentOnchainMetadata> findByAgentId(UUID agentId);

    @Modifying
    @Query("delete from AgentOnchainMetadata m where m.blockNumber >= :fromBlock")
    void deleteFromBlock(@Param("fromBlock") BigInteger fromBlock);
}

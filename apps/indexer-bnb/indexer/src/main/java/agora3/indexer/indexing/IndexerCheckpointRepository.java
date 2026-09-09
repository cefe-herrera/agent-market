package agora3.indexer.indexing;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface IndexerCheckpointRepository extends JpaRepository<IndexerCheckpoint, UUID> {

    Optional<IndexerCheckpoint> findByChainId(Long chainId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from IndexerCheckpoint c where c.chainId = :chainId")
    Optional<IndexerCheckpoint> findByChainIdForUpdate(Long chainId);

    void deleteByChainId(Long chainId);
}

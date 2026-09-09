package agora3.indexer.indexing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigInteger;
import java.util.UUID;

public interface ProcessedChainLogRepository extends JpaRepository<ProcessedChainLog, UUID> {

    boolean existsByChainIdAndTransactionHashAndLogIndex(Long chainId, String transactionHash, int logIndex);

    @Modifying
    @Query("delete from ProcessedChainLog l where l.chainId = :chainId and l.blockNumber >= :fromBlock")
    void deleteByChainIdAndBlockNumberGreaterThanEqual(
            @Param("chainId") Long chainId,
            @Param("fromBlock") BigInteger fromBlock
    );
}

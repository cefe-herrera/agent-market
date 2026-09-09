package agora3.indexer.indexing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigInteger;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IndexedBlockRepository extends JpaRepository<IndexedBlock, UUID> {

    Optional<IndexedBlock> findByChainIdAndBlockNumber(Long chainId, BigInteger blockNumber);

    List<IndexedBlock> findByChainIdAndBlockNumberGreaterThanEqualOrderByBlockNumberAsc(
            Long chainId,
            BigInteger blockNumber
    );

    @Modifying
    @Query("delete from IndexedBlock ib where ib.chainId = :chainId and ib.blockNumber >= :fromBlock")
    void deleteFromBlock(@Param("chainId") Long chainId, @Param("fromBlock") BigInteger fromBlock);
}

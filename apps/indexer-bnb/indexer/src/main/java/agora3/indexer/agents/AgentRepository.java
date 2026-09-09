package agora3.indexer.agents;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigInteger;
import java.util.Optional;
import java.util.UUID;

public interface AgentRepository extends JpaRepository<Agent, UUID> {

    Optional<Agent> findByChainIdAndOnchainId(Long chainId, BigInteger onchainId);

    @Modifying
    @Query("delete from Agent a where a.chainId = :chainId and a.createdBlock >= :fromBlock")
    void deleteByChainIdAndCreatedBlockGreaterThanEqual(
            @Param("chainId") Long chainId,
            @Param("fromBlock") BigInteger fromBlock
    );

    @Query(
            value = """
                    SELECT a.* FROM agents a
                    WHERE (
                        LOWER(a.name) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR LOWER(a.description) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR LOWER(a.owner_address) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR LOWER(COALESCE(a.agent_wallet_address, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR CAST(a.onchain_id AS TEXT) LIKE CONCAT('%', :query, '%')
                        OR (:tsQuery <> '' AND a.search_vector @@ to_tsquery('simple', :tsQuery))
                    )
                    ORDER BY GREATEST(
                        similarity(COALESCE(a.name, ''), :query),
                        similarity(COALESCE(a.description, ''), :query),
                        similarity(COALESCE(a.owner_address, ''), :query),
                        similarity(COALESCE(a.agent_wallet_address, ''), :query)
                    ) DESC,
                    a.created_at DESC
                    """,
            countQuery = """
                    SELECT count(*) FROM agents a
                    WHERE (
                        LOWER(a.name) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR LOWER(a.description) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR LOWER(a.owner_address) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR LOWER(COALESCE(a.agent_wallet_address, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR CAST(a.onchain_id AS TEXT) LIKE CONCAT('%', :query, '%')
                        OR (:tsQuery <> '' AND a.search_vector @@ to_tsquery('simple', :tsQuery))
                    )
                    """,
            nativeQuery = true
    )
    Page<Agent> searchByText(
            @Param("query") String query,
            @Param("tsQuery") String tsQuery,
            Pageable pageable
    );
}

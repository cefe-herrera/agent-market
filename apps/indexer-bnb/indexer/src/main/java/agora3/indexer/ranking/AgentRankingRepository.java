package agora3.indexer.ranking;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AgentRankingRepository extends JpaRepository<AgentRanking, UUID> {

    List<AgentRanking> findByRankingTypeOrderByPositionAsc(RankingType rankingType);

    @Modifying
    @Query("delete from AgentRanking ar where ar.rankingType = :rankingType")
    void deleteByRankingType(@Param("rankingType") RankingType rankingType);
}

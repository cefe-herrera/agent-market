package agora3.indexer.ranking;

import agora3.indexer.activity.ActivityService;
import agora3.indexer.agents.Agent;
import agora3.indexer.agents.AgentService;
import agora3.indexer.reputation.AgentReputation;
import agora3.indexer.reputation.ReputationService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class RankingService {

    private final AgentRankingRepository rankingRepository;
    private final ReputationService reputationService;
    private final ActivityService activityService;
    private final AgentService agentService;

    public RankingService(
            AgentRankingRepository rankingRepository,
            ReputationService reputationService,
            ActivityService activityService,
            AgentService agentService
    ) {
        this.rankingRepository = rankingRepository;
        this.reputationService = reputationService;
        this.activityService = activityService;
        this.agentService = agentService;
    }

    @Scheduled(fixedDelayString = "${blockchain.poll-interval-ms}")
    @Transactional
    public void recalculateAll() {
        recalculateTrusted();
        recalculateActive();
        recalculateTrending();
        recalculatePopular();
        recalculateYield();
    }

    public List<AgentRanking> findByType(RankingType rankingType) {
        return rankingRepository.findByRankingTypeOrderByPositionAsc(rankingType);
    }

    private void recalculateTrusted() {
        List<AgentReputation> reputations = reputationService.findAllOrderByScoreDesc();
        replaceRankings(RankingType.TRUSTED, reputations.stream()
                .map(r -> new ScoredAgent(r.getAgentId(), r.getScore()))
                .toList());
    }

    private void recalculateActive() {
        List<ScoredAgent> scored = agentService.findAll(org.springframework.data.domain.Pageable.unpaged())
                .stream()
                .map(agent -> new ScoredAgent(
                        agent.getId(),
                        (double) activityService.getActivityCount(agent.getId())
                ))
                .sorted(Comparator.comparingDouble(ScoredAgent::score).reversed())
                .toList();
        replaceRankings(RankingType.ACTIVE, scored);
    }

    private void recalculateTrending() {
        Instant since = Instant.now().minus(7, ChronoUnit.DAYS);
        long recentCount = activityService.countRecentActivity(since);
        List<ScoredAgent> scored = agentService.findAll(org.springframework.data.domain.Pageable.unpaged())
                .stream()
                .map(Agent::getId)
                .map(id -> new ScoredAgent(id, recentCount > 0 ? activityService.getActivityCount(id) : 0.0))
                .sorted(Comparator.comparingDouble(ScoredAgent::score).reversed())
                .toList();
        replaceRankings(RankingType.TRENDING, scored);
    }

    private void recalculatePopular() {
        recalculateTrusted();
        replaceRankings(RankingType.POPULAR, rankingRepository
                .findByRankingTypeOrderByPositionAsc(RankingType.TRUSTED)
                .stream()
                .map(r -> new ScoredAgent(r.getAgentId(), r.getScore()))
                .toList());
    }

    private void recalculateYield() {
        List<ScoredAgent> scored = reputationService.findAllOrderByScoreDesc().stream()
                .map(r -> new ScoredAgent(r.getAgentId(), r.getScore() * 0.5))
                .toList();
        replaceRankings(RankingType.YIELD, scored);
    }

    private void replaceRankings(RankingType type, List<ScoredAgent> scoredAgents) {
        rankingRepository.deleteByRankingType(type);
        int position = 1;
        for (ScoredAgent scoredAgent : scoredAgents) {
            rankingRepository.save(AgentRanking.of(
                    scoredAgent.agentId(),
                    type,
                    position++,
                    scoredAgent.score()
            ));
        }
    }

    private record ScoredAgent(UUID agentId, double score) {
    }
}

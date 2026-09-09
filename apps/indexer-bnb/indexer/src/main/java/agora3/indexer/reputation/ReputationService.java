package agora3.indexer.reputation;

import agora3.indexer.activity.ActivityService;
import agora3.indexer.validation.AgentValidationResponse;
import agora3.indexer.validation.AgentValidationResponseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class ReputationService {

    private final AgentReputationRepository reputationRepository;
    private final AgentFeedbackRepository feedbackRepository;
    private final AgentValidationResponseRepository validationResponseRepository;
    private final ActivityService activityService;

    public ReputationService(
            AgentReputationRepository reputationRepository,
            AgentFeedbackRepository feedbackRepository,
            AgentValidationResponseRepository validationResponseRepository,
            ActivityService activityService
    ) {
        this.reputationRepository = reputationRepository;
        this.feedbackRepository = feedbackRepository;
        this.validationResponseRepository = validationResponseRepository;
        this.activityService = activityService;
    }

    @Transactional
    public AgentReputation calculate(UUID agentId) {
        long activityCount = activityService.getActivityCount(agentId);
        List<AgentFeedback> feedback = feedbackRepository.findByAgentIdAndRevokedFalse(agentId);
        List<AgentValidationResponse> validations = validationResponseRepository.findByAgentId(agentId);

        double feedbackAverage = feedback.stream()
                .mapToDouble(AgentFeedback::normalizedValue)
                .average()
                .orElse(0.0);

        double validationAverage = validations.stream()
                .mapToInt(AgentValidationResponse::getResponse)
                .average()
                .orElse(0.0);

        double feedbackScore = Math.min(50.0, feedbackAverage * 10.0);
        double validationScore = Math.min(30.0, validationAverage * 0.3);
        double activityScore = Math.min(20.0, activityCount * 2.0);
        double score = Math.min(100.0, feedbackScore + validationScore + activityScore);

        Map<String, Object> factors = new HashMap<>();
        factors.put("activityCount", activityCount);
        factors.put("feedbackCount", feedback.size());
        factors.put("feedbackAverage", feedbackAverage);
        factors.put("feedbackScore", feedbackScore);
        factors.put("validationCount", validations.size());
        factors.put("validationAverage", validationAverage);
        factors.put("validationScore", validationScore);
        factors.put("activityScore", activityScore);

        AgentReputation reputation = reputationRepository.findByAgentId(agentId)
                .orElseGet(() -> AgentReputation.forAgent(agentId));

        reputation.setScore(score);
        reputation.setFactors(factors);
        reputation.setCalculatedAt(Instant.now());

        return reputationRepository.save(reputation);
    }

    public Optional<AgentReputation> findByAgentId(UUID agentId) {
        return reputationRepository.findByAgentId(agentId);
    }

    public List<AgentReputation> findAllOrderByScoreDesc() {
        return reputationRepository.findAllByOrderByScoreDesc();
    }
}

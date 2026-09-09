package agora3.indexer.activity;

import agora3.indexer.common.event.ActivityRecordedEvent;
import agora3.indexer.common.event.AgentCreatedEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigInteger;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ActivityService {

    private final AgentActivityRepository activityRepository;
    private final ApplicationEventPublisher eventPublisher;

    public ActivityService(
            AgentActivityRepository activityRepository,
            ApplicationEventPublisher eventPublisher
    ) {
        this.activityRepository = activityRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public void recordRegistration(AgentCreatedEvent event) {
        record(
                event.agentId(),
                "REGISTERED",
                event.transactionHash(),
                event.blockNumber()
        );
    }

    @Transactional
    public void recordUriUpdated(UUID agentId, String transactionHash, BigInteger blockNumber) {
        record(agentId, "URI_UPDATED", transactionHash, blockNumber);
    }

    @Transactional
    public void recordTransfer(UUID agentId, String transactionHash, BigInteger blockNumber) {
        record(agentId, "TRANSFERRED", transactionHash, blockNumber);
    }

    @Transactional
    public void recordFeedback(UUID agentId, String transactionHash, BigInteger blockNumber) {
        record(agentId, "FEEDBACK_RECEIVED", transactionHash, blockNumber);
    }

    @Transactional
    public void recordValidationResponse(UUID agentId, String transactionHash, BigInteger blockNumber) {
        record(agentId, "VALIDATION_RESPONSE", transactionHash, blockNumber);
    }

    private void record(UUID agentId, String activityType, String transactionHash, BigInteger blockNumber) {
        if (activityRepository.existsByAgentIdAndActivityTypeAndTransactionHashAndBlockNumber(
                agentId,
                activityType,
                transactionHash,
                blockNumber
        )) {
            return;
        }

        AgentActivity activity = activityRepository.save(switch (activityType) {
            case "REGISTERED" -> AgentActivity.registered(agentId, transactionHash, blockNumber, Instant.now());
            case "URI_UPDATED" -> AgentActivity.uriUpdated(agentId, transactionHash, blockNumber, Instant.now());
            case "TRANSFERRED" -> AgentActivity.transferred(agentId, transactionHash, blockNumber, Instant.now());
            case "FEEDBACK_RECEIVED" -> AgentActivity.feedbackReceived(agentId, transactionHash, blockNumber, Instant.now());
            case "VALIDATION_RESPONSE" -> AgentActivity.validationResponse(agentId, transactionHash, blockNumber, Instant.now());
            default -> throw new IllegalArgumentException("Unknown activity type: " + activityType);
        });

        eventPublisher.publishEvent(new ActivityRecordedEvent(
                activity.getAgentId(),
                activity.getActivityType()
        ));
    }

    public long getActivityCount(UUID agentId) {
        return activityRepository.countByAgentId(agentId);
    }

    public List<AgentActivity> findByAgentId(UUID agentId) {
        return activityRepository.findByAgentIdOrderByTimestampDesc(agentId);
    }

    public Page<AgentActivity> findByAgentId(UUID agentId, Pageable pageable) {
        return activityRepository.findByAgentIdOrderByTimestampDesc(agentId, pageable);
    }

    public long countRecentActivity(java.time.Instant since) {
        return activityRepository.countSince(since);
    }

    @Transactional
    public void rollbackFromBlock(java.math.BigInteger fromBlock) {
        activityRepository.deleteFromBlock(fromBlock);
    }
}

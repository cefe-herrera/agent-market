package agora3.indexer.reputation;

import agora3.indexer.agents.AgentService;
import agora3.indexer.common.event.FeedbackReceivedEvent;
import agora3.indexer.common.event.FeedbackRecordedEvent;
import agora3.indexer.common.event.FeedbackResponseAppendedEvent;
import agora3.indexer.common.event.FeedbackRevokedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class FeedbackService {

    private static final Logger log = LoggerFactory.getLogger(FeedbackService.class);

    private final AgentFeedbackRepository feedbackRepository;
    private final AgentFeedbackResponseRepository responseRepository;
    private final AgentService agentService;
    private final PendingFeedbackService pendingFeedbackService;
    private final ReputationService reputationService;
    private final ApplicationEventPublisher eventPublisher;

    public FeedbackService(
            AgentFeedbackRepository feedbackRepository,
            AgentFeedbackResponseRepository responseRepository,
            AgentService agentService,
            PendingFeedbackService pendingFeedbackService,
            ReputationService reputationService,
            ApplicationEventPublisher eventPublisher
    ) {
        this.feedbackRepository = feedbackRepository;
        this.responseRepository = responseRepository;
        this.agentService = agentService;
        this.pendingFeedbackService = pendingFeedbackService;
        this.reputationService = reputationService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public void recordFeedback(FeedbackReceivedEvent event) {
        var agent = agentService.findByChainIdAndOnchainId(event.chainId(), event.agentId());
        if (agent.isEmpty()) {
            pendingFeedbackService.queue(event);
            return;
        }

        UUID agentId = agent.get().getId();
        if (feedbackRepository.findByChainIdAndOnchainAgentIdAndClientAddressAndFeedbackIndex(
                event.chainId(),
                event.agentId(),
                event.clientAddress(),
                event.feedbackIndex()
        ).isPresent()) {
            return;
        }

        feedbackRepository.save(AgentFeedback.fromEvent(agentId, event));
        eventPublisher.publishEvent(new FeedbackRecordedEvent(
                agentId,
                event.clientAddress(),
                event.feedbackIndex(),
                event.blockNumber(),
                event.transactionHash()
        ));
        reputationService.calculate(agentId);
    }

    @Transactional
    public void revokeFeedback(FeedbackRevokedEvent event) {
        feedbackRepository.findByChainIdAndOnchainAgentIdAndClientAddressAndFeedbackIndex(
                event.chainId(),
                event.agentId(),
                event.clientAddress(),
                event.feedbackIndex()
        ).ifPresent(feedback -> {
            feedback.revoke();
            feedbackRepository.save(feedback);
            reputationService.calculate(feedback.getAgentId());
        });
    }

    @Transactional
    public void appendResponse(FeedbackResponseAppendedEvent event) {
        feedbackRepository.findByChainIdAndOnchainAgentIdAndClientAddressAndFeedbackIndex(
                event.chainId(),
                event.agentId(),
                event.clientAddress(),
                event.feedbackIndex()
        ).ifPresent(feedback -> responseRepository.save(
                AgentFeedbackResponse.fromEvent(feedback.getId(), event)
        ));
    }

    public java.util.List<AgentFeedback> findByAgentId(UUID agentId) {
        return feedbackRepository.findByAgentIdOrderByCreatedAtDesc(agentId);
    }

    @Transactional
    public void rollbackFromBlock(Long chainId, java.math.BigInteger fromBlock) {
        responseRepository.deleteFromBlock(fromBlock);
        feedbackRepository.deleteByChainIdAndBlockNumberGreaterThanEqual(chainId, fromBlock);
        pendingFeedbackService.rollbackFromBlock(chainId, fromBlock);
    }
}

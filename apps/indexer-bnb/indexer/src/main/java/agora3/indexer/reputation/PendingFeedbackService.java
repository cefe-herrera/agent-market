package agora3.indexer.reputation;

import agora3.indexer.common.event.FeedbackReceivedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigInteger;
import java.util.UUID;

@Service
public class PendingFeedbackService {

    private static final Logger log = LoggerFactory.getLogger(PendingFeedbackService.class);

    private final PendingFeedbackRepository pendingRepository;
    private final AgentFeedbackRepository feedbackRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final ReputationService reputationService;

    public PendingFeedbackService(
            PendingFeedbackRepository pendingRepository,
            AgentFeedbackRepository feedbackRepository,
            ApplicationEventPublisher eventPublisher,
            @Lazy ReputationService reputationService
    ) {
        this.pendingRepository = pendingRepository;
        this.feedbackRepository = feedbackRepository;
        this.eventPublisher = eventPublisher;
        this.reputationService = reputationService;
    }

    @Transactional
    public void queue(FeedbackReceivedEvent event) {
        if (pendingRepository.findByChainIdAndOnchainAgentIdAndClientAddressAndFeedbackIndex(
                event.chainId(),
                event.agentId(),
                event.clientAddress(),
                event.feedbackIndex()
        ).isPresent()) {
            return;
        }

        pendingRepository.save(PendingFeedback.fromEvent(event));
        log.debug("Queued feedback for unknown agent {} on chain {}", event.agentId(), event.chainId());
    }

    @Transactional
    public void replayFor(Long chainId, BigInteger onchainAgentId, UUID agentId) {
        for (PendingFeedback pending : pendingRepository.findByChainIdAndOnchainAgentId(chainId, onchainAgentId)) {
            if (feedbackRepository.findByChainIdAndOnchainAgentIdAndClientAddressAndFeedbackIndex(
                    chainId,
                    onchainAgentId,
                    pending.getClientAddress(),
                    pending.getFeedbackIndex()
            ).isPresent()) {
                pendingRepository.delete(pending);
                continue;
            }

            FeedbackReceivedEvent event = new FeedbackReceivedEvent(
                    chainId,
                    onchainAgentId,
                    pending.getClientAddress(),
                    pending.getFeedbackIndex(),
                    pending.getValue(),
                    pending.getValueDecimals(),
                    pending.getTag1(),
                    pending.getTag2(),
                    pending.getEndpoint(),
                    pending.getFeedbackUri(),
                    pending.getFeedbackHash(),
                    pending.getRegistryAddress(),
                    pending.getBlockNumber(),
                    pending.getTransactionHash()
            );

            feedbackRepository.save(AgentFeedback.fromEvent(agentId, event));
            pendingRepository.delete(pending);

            eventPublisher.publishEvent(new agora3.indexer.common.event.FeedbackRecordedEvent(
                    agentId,
                    pending.getClientAddress(),
                    pending.getFeedbackIndex(),
                    pending.getBlockNumber(),
                    pending.getTransactionHash()
            ));
        }

        reputationService.calculate(agentId);
    }

    @Transactional
    public void rollbackFromBlock(Long chainId, BigInteger fromBlock) {
        pendingRepository.deleteByChainIdAndBlockNumberGreaterThanEqual(chainId, fromBlock);
    }
}

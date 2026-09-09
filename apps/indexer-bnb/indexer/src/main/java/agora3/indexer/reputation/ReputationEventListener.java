package agora3.indexer.reputation;

import agora3.indexer.agents.AgentService;
import agora3.indexer.common.event.ActivityRecordedEvent;
import agora3.indexer.common.event.FeedbackReceivedEvent;
import agora3.indexer.common.event.FeedbackResponseAppendedEvent;
import agora3.indexer.common.event.FeedbackRevokedEvent;
import agora3.indexer.common.event.MetadataFetchedEvent;
import agora3.indexer.common.event.ValidationRespondedEvent;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

@Component
public class ReputationEventListener {

    private final ReputationService reputationService;
    private final FeedbackService feedbackService;
    private final AgentService agentService;

    public ReputationEventListener(
            ReputationService reputationService,
            FeedbackService feedbackService,
            AgentService agentService
    ) {
        this.reputationService = reputationService;
        this.feedbackService = feedbackService;
        this.agentService = agentService;
    }

    @ApplicationModuleListener
    public void onActivityRecorded(ActivityRecordedEvent event) {
        reputationService.calculate(event.agentId());
    }

    @ApplicationModuleListener
    public void onMetadataFetched(MetadataFetchedEvent event) {
        reputationService.calculate(event.agentId());
    }

    @ApplicationModuleListener
    public void onFeedbackReceived(FeedbackReceivedEvent event) {
        feedbackService.recordFeedback(event);
    }

    @ApplicationModuleListener
    public void onFeedbackRevoked(FeedbackRevokedEvent event) {
        feedbackService.revokeFeedback(event);
    }

    @ApplicationModuleListener
    public void onResponseAppended(FeedbackResponseAppendedEvent event) {
        feedbackService.appendResponse(event);
    }

    @ApplicationModuleListener
    public void onValidationResponded(ValidationRespondedEvent event) {
        agentService.findByChainIdAndOnchainId(event.chainId(), event.agentId())
                .ifPresent(agent -> reputationService.calculate(agent.getId()));
    }
}

package agora3.indexer.reputation;

import agora3.indexer.common.event.AgentCreatedEvent;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

@Component
public class PendingFeedbackReplayListener {

    private final PendingFeedbackService pendingFeedbackService;

    public PendingFeedbackReplayListener(PendingFeedbackService pendingFeedbackService) {
        this.pendingFeedbackService = pendingFeedbackService;
    }

    @ApplicationModuleListener
    public void onAgentCreated(AgentCreatedEvent event) {
        pendingFeedbackService.replayFor(event.chainId(), event.onchainAgentId(), event.agentId());
    }
}

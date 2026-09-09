package agora3.indexer.activity;

import agora3.indexer.agents.AgentService;
import agora3.indexer.common.event.AgentCreatedEvent;
import agora3.indexer.common.event.AgentTransferredEvent;
import agora3.indexer.common.event.AgentUriUpdatedEvent;
import agora3.indexer.common.event.FeedbackRecordedEvent;
import agora3.indexer.common.event.ValidationRespondedEvent;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

@Component
public class ActivityEventListener {

    private final ActivityService activityService;
    private final AgentService agentService;

    public ActivityEventListener(ActivityService activityService, AgentService agentService) {
        this.activityService = activityService;
        this.agentService = agentService;
    }

    @ApplicationModuleListener
    public void onAgentCreated(AgentCreatedEvent event) {
        activityService.recordRegistration(event);
    }

    @ApplicationModuleListener
    public void onUriUpdated(AgentUriUpdatedEvent event) {
        agentService.findByChainIdAndOnchainId(event.chainId(), event.agentId())
                .ifPresent(agent -> activityService.recordUriUpdated(
                        agent.getId(),
                        event.transactionHash(),
                        event.blockNumber()
                ));
    }

    @ApplicationModuleListener
    public void onTransferred(AgentTransferredEvent event) {
        agentService.findByChainIdAndOnchainId(event.chainId(), event.agentId())
                .ifPresent(agent -> activityService.recordTransfer(
                        agent.getId(),
                        event.transactionHash(),
                        event.blockNumber()
                ));
    }

    @ApplicationModuleListener
    public void onFeedbackRecorded(FeedbackRecordedEvent event) {
        activityService.recordFeedback(
                event.agentId(),
                event.transactionHash(),
                event.blockNumber()
        );
    }

    @ApplicationModuleListener
    public void onValidationResponded(ValidationRespondedEvent event) {
        agentService.findByChainIdAndOnchainId(event.chainId(), event.agentId())
                .ifPresent(agent -> activityService.recordValidationResponse(
                        agent.getId(),
                        event.transactionHash(),
                        event.blockNumber()
                ));
    }
}

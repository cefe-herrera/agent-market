package agora3.indexer.agents;

import agora3.indexer.common.event.AgentRegisteredEvent;
import agora3.indexer.common.event.AgentTransferredEvent;
import agora3.indexer.common.event.AgentUriUpdatedEvent;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

@Component
public class AgentEventListener {

    private final AgentService agentService;

    public AgentEventListener(AgentService agentService) {
        this.agentService = agentService;
    }

    @ApplicationModuleListener
    public void onAgentRegistered(AgentRegisteredEvent event) {
        agentService.create(event);
    }

    @ApplicationModuleListener
    public void onUriUpdated(AgentUriUpdatedEvent event) {
        agentService.updateMetadataUri(event);
    }

    @ApplicationModuleListener
    public void onTransferred(AgentTransferredEvent event) {
        agentService.updateOwner(event);
    }
}

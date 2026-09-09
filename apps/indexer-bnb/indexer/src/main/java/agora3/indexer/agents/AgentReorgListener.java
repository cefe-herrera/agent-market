package agora3.indexer.agents;

import agora3.indexer.common.event.ChainReorgEvent;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

@Component
public class AgentReorgListener {

    private final AgentService agentService;

    public AgentReorgListener(AgentService agentService) {
        this.agentService = agentService;
    }

    @ApplicationModuleListener
    public void onChainReorg(ChainReorgEvent event) {
        agentService.rollbackFromBlock(event.chainId(), event.fromBlock());
    }
}

package agora3.indexer.metadata;

import agora3.indexer.agents.AgentService;
import agora3.indexer.common.event.AgentCreatedEvent;
import agora3.indexer.common.event.AgentMetadataSetEvent;
import agora3.indexer.common.event.AgentUriUpdatedEvent;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class MetadataEventListener {

    private final MetadataService metadataService;
    private final OnchainMetadataService onchainMetadataService;
    private final AgentService agentService;

    public MetadataEventListener(
            MetadataService metadataService,
            OnchainMetadataService onchainMetadataService,
            AgentService agentService
    ) {
        this.metadataService = metadataService;
        this.onchainMetadataService = onchainMetadataService;
        this.agentService = agentService;
    }

    @Async
    @ApplicationModuleListener
    public void onAgentCreated(AgentCreatedEvent event) {
        if (event.metadataUri() == null || event.metadataUri().isBlank()) {
            return;
        }
        metadataService.fetchAndPersist(event.agentId(), event.metadataUri());
    }

    @Async
    @ApplicationModuleListener
    public void onUriUpdated(AgentUriUpdatedEvent event) {
        if (event.newUri() == null || event.newUri().isBlank()) {
            return;
        }
        agentService.findByChainIdAndOnchainId(event.chainId(), event.agentId())
                .ifPresent(agent -> metadataService.refresh(agent.getId(), event.newUri()));
    }

    @ApplicationModuleListener
    public void onMetadataSet(AgentMetadataSetEvent event) {
        agentService.findByChainIdAndOnchainId(event.chainId(), event.agentId())
                .ifPresent(agent -> {
                    onchainMetadataService.upsert(agent.getId(), event);

                    if ("agentWallet".equals(event.metadataKey())) {
                        OnchainMetadataValueDecoder.decodeWalletAddress(event.metadataValue())
                                .ifPresent(wallet -> agentService.updateAgentWallet(
                                        event.chainId(),
                                        event.agentId(),
                                        wallet
                                ));
                    }
                });
    }
}

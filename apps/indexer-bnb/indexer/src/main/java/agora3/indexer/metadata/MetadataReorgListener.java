package agora3.indexer.metadata;

import agora3.indexer.common.event.ChainReorgEvent;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

@Component
public class MetadataReorgListener {

    private final OnchainMetadataService onchainMetadataService;

    public MetadataReorgListener(OnchainMetadataService onchainMetadataService) {
        this.onchainMetadataService = onchainMetadataService;
    }

    @ApplicationModuleListener
    public void onChainReorg(ChainReorgEvent event) {
        onchainMetadataService.rollbackFromBlock(event.fromBlock());
    }
}

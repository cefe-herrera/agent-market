package agora3.indexer.metadata;

import agora3.indexer.common.event.AgentMetadataSetEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class OnchainMetadataService {

    private final AgentOnchainMetadataRepository repository;

    public OnchainMetadataService(AgentOnchainMetadataRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void upsert(UUID agentId, AgentMetadataSetEvent event) {
        AgentOnchainMetadata metadata = repository
                .findByAgentIdAndMetadataKey(agentId, event.metadataKey())
                .orElseGet(() -> AgentOnchainMetadata.of(
                        agentId,
                        event.metadataKey(),
                        event.metadataValue(),
                        event.blockNumber(),
                        event.transactionHash()
                ));

        metadata.apply(event.metadataValue(), event.blockNumber(), event.transactionHash());
        repository.save(metadata);
    }

    @Transactional
    public void rollbackFromBlock(java.math.BigInteger fromBlock) {
        repository.deleteFromBlock(fromBlock);
    }
}

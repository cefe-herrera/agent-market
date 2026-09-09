package agora3.indexer.metadata;

import agora3.indexer.agents.AgentService;
import agora3.indexer.common.event.MetadataFetchedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class MetadataService {

    private static final Logger log = LoggerFactory.getLogger(MetadataService.class);

    private final AgentMetadataRepository metadataRepository;
    private final AgentService agentService;
    private final MetadataFetcherService fetcherService;
    private final MetadataProperties properties;
    private final ApplicationEventPublisher eventPublisher;

    public MetadataService(
            AgentMetadataRepository metadataRepository,
            AgentService agentService,
            MetadataFetcherService fetcherService,
            MetadataProperties properties,
            ApplicationEventPublisher eventPublisher
    ) {
        this.metadataRepository = metadataRepository;
        this.agentService = agentService;
        this.fetcherService = fetcherService;
        this.properties = properties;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public void fetchAndPersist(UUID agentId, String metadataUri) {
        fetchAndPersist(agentId, metadataUri, false);
    }

    @Transactional
    public void refresh(UUID agentId, String metadataUri) {
        fetchAndPersist(agentId, metadataUri, true);
    }

    @Transactional
    public void retryDueFetches() {
        for (AgentMetadata metadata : metadataRepository.findDueForRetry(Instant.now())) {
            agentService.findById(metadata.getAgentId()).ifPresent(agent -> {
                if (agent.getMetadataUri() != null && !agent.getMetadataUri().isBlank()) {
                    fetchAndPersist(agent.getId(), agent.getMetadataUri(), true);
                }
            });
        }
    }

    private void fetchAndPersist(UUID agentId, String metadataUri, boolean force) {
        AgentMetadata metadata = metadataRepository.findByAgentId(agentId)
                .orElseGet(() -> metadataRepository.save(AgentMetadata.pending(agentId)));

        if (!force && "SUCCESS".equals(metadata.getStatus())) {
            return;
        }

        if (force) {
            metadata.setStatus("PENDING");
        }

        try {
            Map<String, Object> raw = fetcherService.fetch(metadataUri);
            metadata.setRawJson(raw);
            metadata.setName(stringValue(raw, "name"));
            metadata.setDescription(stringValue(raw, "description"));
            metadata.setImageUri(stringValue(raw, "image"));
            metadata.setStatus("SUCCESS");
            metadata.setFetchedAt(Instant.now());
            metadata.setRetryCount(0);
            metadata.setNextRetryAt(null);
            metadataRepository.save(metadata);

            agentService.updateProfile(agentId, metadata.getName(), metadata.getDescription());

            eventPublisher.publishEvent(new MetadataFetchedEvent(
                    agentId,
                    metadata.getName(),
                    metadata.getDescription()
            ));
        } catch (Exception ex) {
            scheduleRetry(metadata, ex);
        }
    }

    private void scheduleRetry(AgentMetadata metadata, Exception ex) {
        int nextRetryCount = metadata.getRetryCount() + 1;
        metadata.setRetryCount(nextRetryCount);

        if (nextRetryCount >= properties.maxRetries()) {
            metadata.setStatus("FAILED");
            metadata.setNextRetryAt(null);
            log.warn(
                    "Metadata fetch permanently failed for agent {} after {} attempts: {}",
                    metadata.getAgentId(),
                    nextRetryCount,
                    ex.getMessage()
            );
        } else {
            metadata.setStatus("RETRY");
            metadata.setNextRetryAt(Instant.now().plusSeconds(calculateBackoffSeconds(nextRetryCount)));
            log.debug(
                    "Metadata fetch failed for agent {}, retry {}/{} scheduled",
                    metadata.getAgentId(),
                    nextRetryCount,
                    properties.maxRetries()
            );
        }

        metadata.setFetchedAt(Instant.now());
        metadataRepository.save(metadata);
    }

    private long calculateBackoffSeconds(int retryCount) {
        long delay = (long) properties.retryInitialDelaySeconds() * (1L << Math.min(retryCount - 1, 10));
        return Math.min(delay, properties.retryMaxDelaySeconds());
    }

    public java.util.Optional<AgentMetadata> findByAgentId(UUID agentId) {
        return metadataRepository.findByAgentId(agentId);
    }

    private String stringValue(Map<String, Object> raw, String key) {
        Object value = raw.get(key);
        return value == null ? null : value.toString();
    }
}

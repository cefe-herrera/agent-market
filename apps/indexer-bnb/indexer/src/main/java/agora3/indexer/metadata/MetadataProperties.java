package agora3.indexer.metadata;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "metadata")
public record MetadataProperties(
        String ipfsGateway,
        int fetchTimeoutSeconds,
        int maxRetries,
        int retryInitialDelaySeconds,
        int retryMaxDelaySeconds,
        long retryPollIntervalMs
) {
}

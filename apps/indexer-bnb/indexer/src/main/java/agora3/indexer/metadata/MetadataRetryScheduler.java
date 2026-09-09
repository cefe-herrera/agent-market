package agora3.indexer.metadata;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class MetadataRetryScheduler {

    private final MetadataService metadataService;

    public MetadataRetryScheduler(MetadataService metadataService) {
        this.metadataService = metadataService;
    }

    @Scheduled(fixedDelayString = "${metadata.retry-poll-interval-ms:60000}")
    public void retryDueMetadata() {
        metadataService.retryDueFetches();
    }
}

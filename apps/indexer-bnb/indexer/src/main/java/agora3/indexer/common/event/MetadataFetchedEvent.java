package agora3.indexer.common.event;

import java.util.UUID;

public record MetadataFetchedEvent(
        UUID agentId,
        String name,
        String description
) {
}

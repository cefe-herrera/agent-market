package agora3.indexer.common.event;

import java.util.UUID;

public record ActivityRecordedEvent(
        UUID agentId,
        String activityType
) {
}

package agora3.indexer.activity;

import agora3.indexer.common.event.ChainReorgEvent;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

@Component
public class ActivityReorgListener {

    private final ActivityService activityService;

    public ActivityReorgListener(ActivityService activityService) {
        this.activityService = activityService;
    }

    @ApplicationModuleListener
    public void onChainReorg(ChainReorgEvent event) {
        activityService.rollbackFromBlock(event.fromBlock());
    }
}

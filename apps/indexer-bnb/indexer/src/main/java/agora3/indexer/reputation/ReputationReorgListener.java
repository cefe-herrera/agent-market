package agora3.indexer.reputation;

import agora3.indexer.common.event.ChainReorgEvent;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

@Component
public class ReputationReorgListener {

    private final FeedbackService feedbackService;

    public ReputationReorgListener(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @ApplicationModuleListener
    public void onChainReorg(ChainReorgEvent event) {
        feedbackService.rollbackFromBlock(event.chainId(), event.fromBlock());
    }
}

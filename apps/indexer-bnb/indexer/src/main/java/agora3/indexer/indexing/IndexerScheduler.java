package agora3.indexer.indexing;

import agora3.indexer.common.exception.BlockchainAuthException;
import agora3.indexer.common.exception.BlockchainRpcException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class IndexerScheduler {

    private static final Logger log = LoggerFactory.getLogger(IndexerScheduler.class);

    private final IndexerService indexerService;

    private volatile boolean authFailurePaused;

    public IndexerScheduler(IndexerService indexerService) {
        this.indexerService = indexerService;
    }

    @Scheduled(fixedDelayString = "${blockchain.poll-interval-ms}")
    public void index() {
        if (authFailurePaused) {
            return;
        }

        try {
            indexerService.tryProcessNextBlocks();
        } catch (BlockchainAuthException ex) {
            // Credentials never fix themselves, so stop polling instead of hammering the provider.
            authFailurePaused = true;
            log.error(
                    "Scheduled indexing paused: {}. Fix the RPC credentials and POST "
                            + "/api/v1/indexer/resume (or restart the app) to continue.",
                    ex.getMessage()
            );
        } catch (BlockchainRpcException ex) {
            log.warn("Blockchain RPC unavailable, will retry on next tick: {}", ex.getMessage());
            log.debug("Blockchain RPC failure details", ex);
        }
    }

    public boolean isAuthFailurePaused() {
        return authFailurePaused;
    }

    public void resume() {
        authFailurePaused = false;
        log.info("Scheduled indexing resumed");
    }
}

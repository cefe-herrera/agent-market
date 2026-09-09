package agora3.indexer.api;

import agora3.indexer.api.dto.IndexerRunResponse;
import agora3.indexer.api.dto.IndexerStatusResponse;
import agora3.indexer.common.exception.BlockchainRpcException;
import agora3.indexer.indexing.IndexerScheduler;
import agora3.indexer.indexing.IndexerService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigInteger;

@RestController
@RequestMapping("/api/v1/indexer")
@Tag(name = "Indexer", description = "Manual indexer control and status")
public class IndexerController {

    private final IndexerService indexerService;
    private final IndexerScheduler indexerScheduler;

    public IndexerController(IndexerService indexerService, IndexerScheduler indexerScheduler) {
        this.indexerService = indexerService;
        this.indexerScheduler = indexerScheduler;
    }

    /**
     * Clears the pause set after an RPC authentication failure, once the credentials are fixed.
     */
    @PostMapping("/resume")
    public ResponseEntity<Void> resume() {
        indexerScheduler.resume();
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/status")
    public ResponseEntity<IndexerStatusResponse> status() {
        try {
            return ResponseEntity.ok(IndexerStatusResponse.from(indexerService.getStatus()));
        } catch (BlockchainRpcException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }
    }

    @PostMapping("/run")
    public ResponseEntity<IndexerRunResponse> run(
            @RequestParam(defaultValue = "false") boolean resetCheckpoint
    ) {
        try {
            if (resetCheckpoint) {
                indexerService.resetCheckpoint();
            }
            return ResponseEntity.ok(IndexerRunResponse.from(indexerService.processNextBlocks()));
        } catch (BlockchainRpcException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(rpcError(ex));
        }
    }

    @PostMapping("/checkpoint")
    public ResponseEntity<IndexerStatusResponse> moveCheckpoint(@RequestParam BigInteger block) {
        try {
            indexerService.moveCheckpointTo(block);
            return ResponseEntity.ok(IndexerStatusResponse.from(indexerService.getStatus()));
        } catch (BlockchainRpcException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }
    }

    private IndexerRunResponse rpcError(BlockchainRpcException ex) {
        return new IndexerRunResponse(
                "RPC_ERROR",
                ex.getMessage(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                0
        );
    }
}

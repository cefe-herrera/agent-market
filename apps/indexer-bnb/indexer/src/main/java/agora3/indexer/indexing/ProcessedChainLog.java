package agora3.indexer.indexing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigInteger;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "processed_chain_logs")
public class ProcessedChainLog {

    @Id
    private UUID id;

    @Column(name = "chain_id", nullable = false)
    private Long chainId;

    @Column(name = "transaction_hash", nullable = false, length = 66)
    private String transactionHash;

    @Column(name = "log_index", nullable = false)
    private int logIndex;

    @Column(name = "block_number", nullable = false)
    private BigInteger blockNumber;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt;

    protected ProcessedChainLog() {
    }

    public static ProcessedChainLog of(
            Long chainId,
            String transactionHash,
            int logIndex,
            BigInteger blockNumber
    ) {
        ProcessedChainLog log = new ProcessedChainLog();
        log.id = UUID.randomUUID();
        log.chainId = chainId;
        log.transactionHash = transactionHash;
        log.logIndex = logIndex;
        log.blockNumber = blockNumber;
        log.processedAt = Instant.now();
        return log;
    }
}

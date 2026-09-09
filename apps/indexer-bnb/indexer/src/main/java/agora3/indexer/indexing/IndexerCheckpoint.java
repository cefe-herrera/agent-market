package agora3.indexer.indexing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigInteger;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "indexer_checkpoint")
public class IndexerCheckpoint {

    @Id
    private UUID id;

    @Column(name = "chain_id", nullable = false, unique = true)
    private Long chainId;

    @Column(name = "last_block", nullable = false)
    private BigInteger lastBlock;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected IndexerCheckpoint() {
    }

    public IndexerCheckpoint(Long chainId, BigInteger lastBlock) {
        this.id = UUID.randomUUID();
        this.chainId = chainId;
        this.lastBlock = lastBlock;
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public Long getChainId() {
        return chainId;
    }

    public BigInteger getLastBlock() {
        return lastBlock;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setLastBlock(BigInteger lastBlock) {
        this.lastBlock = lastBlock;
        this.updatedAt = Instant.now();
    }
}

package agora3.indexer.indexing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigInteger;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "indexed_blocks")
public class IndexedBlock {

    @Id
    private UUID id;

    @Column(name = "chain_id", nullable = false)
    private Long chainId;

    @Column(name = "block_number", nullable = false)
    private BigInteger blockNumber;

    @Column(name = "block_hash", nullable = false, length = 66)
    private String blockHash;

    @Column(name = "parent_hash", nullable = false, length = 66)
    private String parentHash;

    @Column(name = "indexed_at", nullable = false)
    private Instant indexedAt;

    protected IndexedBlock() {
    }

    public IndexedBlock(Long chainId, BigInteger blockNumber, String blockHash, String parentHash) {
        this.id = UUID.randomUUID();
        this.chainId = chainId;
        this.blockNumber = blockNumber;
        this.blockHash = blockHash;
        this.parentHash = parentHash;
        this.indexedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public Long getChainId() {
        return chainId;
    }

    public BigInteger getBlockNumber() {
        return blockNumber;
    }

    public String getBlockHash() {
        return blockHash;
    }

    public String getParentHash() {
        return parentHash;
    }
}

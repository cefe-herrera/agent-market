package agora3.indexer.indexing;

import agora3.indexer.blockchain.BlockchainBlock;
import agora3.indexer.blockchain.BlockchainProperties;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigInteger;
import java.util.Optional;

@Service
public class BlockProcessorService {

    private final IndexedBlockRepository indexedBlockRepository;
    private final BlockchainProperties properties;

    public BlockProcessorService(
            IndexedBlockRepository indexedBlockRepository,
            BlockchainProperties properties
    ) {
        this.indexedBlockRepository = indexedBlockRepository;
        this.properties = properties;
    }

    @Transactional
    public void recordBlock(BlockchainBlock block) {
        indexedBlockRepository.findByChainIdAndBlockNumber(properties.chainId(), block.number())
                .ifPresentOrElse(
                        existing -> {
                            if (!existing.getBlockHash().equals(block.hash())) {
                                throw new ReorgDetectedException(block.number());
                            }
                        },
                        () -> indexedBlockRepository.save(new IndexedBlock(
                                properties.chainId(),
                                block.number(),
                                block.hash(),
                                block.parentHash()
                        ))
                );
    }

    public Optional<BigInteger> findReorgFrom(BlockchainBlock block) {
        return indexedBlockRepository
                .findByChainIdAndBlockNumber(properties.chainId(), block.number())
                .filter(existing -> !existing.getBlockHash().equals(block.hash()))
                .map(existing -> block.number());
    }

    public static class ReorgDetectedException extends RuntimeException {

        private final BigInteger blockNumber;

        public ReorgDetectedException(BigInteger blockNumber) {
            super("Reorg detected at block " + blockNumber);
            this.blockNumber = blockNumber;
        }

        public BigInteger blockNumber() {
            return blockNumber;
        }
    }
}

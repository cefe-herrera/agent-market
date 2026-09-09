package agora3.indexer.indexing;

import agora3.indexer.common.event.ChainReorgEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigInteger;

@Service
public class ReorgService {

    private static final Logger log = LoggerFactory.getLogger(ReorgService.class);

    private final IndexedBlockRepository indexedBlockRepository;
    private final IndexerCheckpointRepository checkpointRepository;
    private final ProcessedChainLogRepository processedChainLogRepository;
    private final ApplicationEventPublisher eventPublisher;

    public ReorgService(
            IndexedBlockRepository indexedBlockRepository,
            IndexerCheckpointRepository checkpointRepository,
            ProcessedChainLogRepository processedChainLogRepository,
            ApplicationEventPublisher eventPublisher
    ) {
        this.indexedBlockRepository = indexedBlockRepository;
        this.checkpointRepository = checkpointRepository;
        this.processedChainLogRepository = processedChainLogRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public void rollbackFrom(Long chainId, BigInteger fromBlock) {
        log.warn("Rolling back indexed state from block {} on chain {}", fromBlock, chainId);

        indexedBlockRepository.deleteFromBlock(chainId, fromBlock);
        processedChainLogRepository.deleteByChainIdAndBlockNumberGreaterThanEqual(chainId, fromBlock);
        eventPublisher.publishEvent(new ChainReorgEvent(chainId, fromBlock));

        checkpointRepository.findByChainId(chainId).ifPresent(checkpoint -> {
            if (checkpoint.getLastBlock().compareTo(fromBlock) >= 0) {
                BigInteger resetBlock = fromBlock.subtract(BigInteger.ONE);
                if (resetBlock.signum() < 0) {
                    resetBlock = BigInteger.ZERO;
                }
                checkpoint.setLastBlock(resetBlock);
                checkpointRepository.save(checkpoint);
            }
        });
    }
}

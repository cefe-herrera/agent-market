package agora3.indexer.indexing;

import agora3.indexer.blockchain.BlockchainProperties;
import agora3.indexer.blockchain.BlockchainService;
import agora3.indexer.blockchain.ContractEventDecoder;
import agora3.indexer.common.exception.BlockchainRpcException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.event.EventListener;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigInteger;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class IndexerService {

    private static final Logger log = LoggerFactory.getLogger(IndexerService.class);

    private final BlockchainService blockchainService;
    private final BlockchainProperties properties;
    private final ContractEventDecoder contractEventDecoder;
    private final IndexerCheckpointRepository checkpointRepository;
    private final BlockProcessorService blockProcessorService;
    private final LogProcessorService logProcessorService;
    private final ReorgService reorgService;
    private final IndexedBlockRepository indexedBlockRepository;
    private final IndexerService self;

    private final ReentrantLock runLock = new ReentrantLock();
    private volatile long lastCaughtUpLogMs;

    public IndexerService(
            BlockchainService blockchainService,
            BlockchainProperties properties,
            ContractEventDecoder contractEventDecoder,
            IndexerCheckpointRepository checkpointRepository,
            BlockProcessorService blockProcessorService,
            LogProcessorService logProcessorService,
            ReorgService reorgService,
            IndexedBlockRepository indexedBlockRepository,
            @Lazy IndexerService self
    ) {
        this.blockchainService = blockchainService;
        this.properties = properties;
        this.contractEventDecoder = contractEventDecoder;
        this.checkpointRepository = checkpointRepository;
        this.blockProcessorService = blockProcessorService;
        this.logProcessorService = logProcessorService;
        this.reorgService = reorgService;
        this.indexedBlockRepository = indexedBlockRepository;
        this.self = self;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void logStartupState() {
        try {
            BigInteger chainHead = blockchainService.getCurrentBlockNumber();
            BigInteger checkpointBlock = checkpointRepository
                    .findByChainId(properties.chainId())
                    .map(IndexerCheckpoint::getLastBlock)
                    .orElse(BigInteger.valueOf(properties.startBlock() - 1));

            log.info(
                    "Indexer ready — chainId={} registry={} startBlock={} checkpoint={} chainHead={}",
                    properties.chainId(),
                    properties.registryAddress(),
                    properties.startBlock(),
                    checkpointBlock,
                    chainHead
            );

            if (chainHead.subtract(BigInteger.valueOf(properties.confirmationBlocks()))
                    .compareTo(checkpointBlock) <= 0) {
                log.info(
                        "Indexer is caught up with the chain. POST /api/v1/indexer/run?resetCheckpoint=true to reindex."
                );
            }
        } catch (BlockchainRpcException ex) {
            log.warn("Indexer started but blockchain RPC is unavailable: {}", ex.getMessage());
        }
    }

    /**
     * Manual/API runs wait for the lock. Only one indexing pass may run at a time.
     */
    public IndexerRunResult processNextBlocks() {
        runLock.lock();
        try {
            return self.processNextBlocksInTransaction();
        } finally {
            runLock.unlock();
        }
    }

    /**
     * Scheduler tick: skip quietly when a manual run or prior tick is still holding the lock.
     */
    public void tryProcessNextBlocks() {
        if (!runLock.tryLock()) {
            log.debug("Skipping scheduled indexer tick: another run is in progress");
            return;
        }
        try {
            self.processNextBlocksInTransaction();
        } catch (ObjectOptimisticLockingFailureException ex) {
            log.warn("Checkpoint update conflict during scheduled run, will retry on next tick: {}", ex.getMessage());
        } finally {
            runLock.unlock();
        }
    }

    public void resetCheckpoint() {
        runLock.lock();
        try {
            self.resetCheckpointInTransaction();
        } finally {
            runLock.unlock();
        }
    }

    public void moveCheckpointTo(BigInteger block) {
        runLock.lock();
        try {
            self.moveCheckpointToInTransaction(block);
        } finally {
            runLock.unlock();
        }
    }

    @Transactional
    public void resetCheckpointInTransaction() {
        checkpointRepository.deleteByChainId(properties.chainId());
        checkpointRepository.flush();
        indexedBlockRepository.deleteFromBlock(properties.chainId(), BigInteger.ZERO);
        log.info("Indexer checkpoint reset for chain {}", properties.chainId());
    }

    @Transactional
    public void moveCheckpointToInTransaction(BigInteger block) {
        IndexerCheckpoint checkpoint = checkpointRepository
                .findByChainIdForUpdate(properties.chainId())
                .orElseGet(() -> new IndexerCheckpoint(properties.chainId(), block));

        checkpoint.setLastBlock(block);
        checkpointRepository.save(checkpoint);
        indexedBlockRepository.deleteFromBlock(properties.chainId(), block.add(BigInteger.ONE));

        log.info("Indexer checkpoint moved to block {} on chain {}", block, properties.chainId());
    }

    public IndexerStatus getStatus() {
        BigInteger startBlock = BigInteger.valueOf(properties.startBlock());
        BigInteger checkpoint = checkpointRepository
                .findByChainId(properties.chainId())
                .map(IndexerCheckpoint::getLastBlock)
                .orElse(startBlock.subtract(BigInteger.ONE));

        BigInteger chainHead = blockchainService.getCurrentBlockNumber();
        BigInteger safeHead = chainHead.subtract(BigInteger.valueOf(properties.confirmationBlocks()));

        BigInteger indexed = checkpoint.subtract(startBlock).add(BigInteger.ONE).max(BigInteger.ZERO);
        BigInteger remaining = safeHead.subtract(checkpoint).max(BigInteger.ZERO);
        BigInteger total = indexed.add(remaining);

        double progress = total.signum() == 0
                ? 100.0
                : indexed.doubleValue() * 100.0 / total.doubleValue();

        return new IndexerStatus(
                properties.chainId(),
                properties.registryAddress(),
                properties.reputationRegistryAddress(),
                properties.validationRegistryAddress(),
                contractEventDecoder.allEventTopics(
                        properties.reputationEnabled(),
                        properties.validationEnabled()
                ),
                startBlock,
                checkpoint,
                chainHead,
                safeHead,
                indexed,
                remaining,
                progress,
                remaining.signum() == 0
        );
    }

    @Transactional
    public IndexerRunResult processNextBlocksInTransaction() {
        IndexerCheckpoint checkpoint = checkpointRepository
                .findByChainIdForUpdate(properties.chainId())
                .orElseGet(() -> checkpointRepository.save(
                        new IndexerCheckpoint(properties.chainId(), BigInteger.valueOf(properties.startBlock() - 1))
                ));

        BigInteger checkpointBefore = checkpoint.getLastBlock();
        BigInteger chainHead = blockchainService.getCurrentBlockNumber();
        BigInteger head = chainHead.subtract(BigInteger.valueOf(properties.confirmationBlocks()));

        if (head.compareTo(checkpoint.getLastBlock()) <= 0) {
            long now = System.currentTimeMillis();
            if (now - lastCaughtUpLogMs > 60_000) {
                log.info(
                        "Indexer caught up: checkpoint={} safeHead={}. Use resetCheckpoint=true to reindex.",
                        checkpoint.getLastBlock(),
                        head
                );
                lastCaughtUpLogMs = now;
            }
            return IndexerRunResult.caughtUp(
                    properties.chainId(),
                    chainHead,
                    head,
                    checkpoint.getLastBlock()
            );
        }

        BigInteger fromBlock = checkpoint.getLastBlock().add(BigInteger.ONE);
        BigInteger toBlock = fromBlock
                .add(BigInteger.valueOf(properties.batchSize() - 1L))
                .min(head);

        if (properties.verifyBlocks()) {
            for (BigInteger blockNumber = fromBlock; blockNumber.compareTo(toBlock) <= 0; blockNumber = blockNumber.add(BigInteger.ONE)) {
                var block = blockchainService.getBlock(blockNumber);
                blockProcessorService.findReorgFrom(block).ifPresent(reorgFrom -> {
                    log.warn("Rolling back from block {} due to reorg", reorgFrom);
                    reorgService.rollbackFrom(properties.chainId(), reorgFrom);
                });
                blockProcessorService.recordBlock(block);
            }
        }

        List<String> addresses = properties.monitoredAddresses();
        List<String> topics = contractEventDecoder.allEventTopics(
                properties.reputationEnabled(),
                properties.validationEnabled()
        );

        var logs = blockchainService.getLogs(fromBlock, toBlock, addresses, topics);
        logProcessorService.processLogs(logs);

        checkpoint.setLastBlock(toBlock);
        checkpointRepository.save(checkpoint);

        BigInteger remaining = head.subtract(toBlock).max(BigInteger.ZERO);
        log.info(
                "Indexed blocks {} to {} on chain {} ({} logs, {} blocks behind head)",
                fromBlock,
                toBlock,
                properties.chainId(),
                logs.size(),
                remaining
        );

        return IndexerRunResult.processed(
                properties.chainId(),
                chainHead,
                head,
                checkpointBefore,
                fromBlock,
                toBlock,
                logs.size()
        );
    }
}

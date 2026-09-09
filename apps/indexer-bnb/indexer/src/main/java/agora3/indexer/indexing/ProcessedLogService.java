package agora3.indexer.indexing;

import agora3.indexer.blockchain.BlockchainLog;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProcessedLogService {

    private final ProcessedChainLogRepository repository;

    public ProcessedLogService(ProcessedChainLogRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public boolean alreadyProcessed(Long chainId, BlockchainLog log) {
        return repository.existsByChainIdAndTransactionHashAndLogIndex(
                chainId,
                log.transactionHash(),
                log.logIndex()
        );
    }

    @Transactional
    public void markProcessed(Long chainId, BlockchainLog log) {
        if (!alreadyProcessed(chainId, log)) {
            repository.save(ProcessedChainLog.of(
                    chainId,
                    log.transactionHash(),
                    log.logIndex(),
                    log.blockNumber()
            ));
        }
    }
}

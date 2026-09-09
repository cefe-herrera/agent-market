package agora3.indexer.indexing;

import java.math.BigInteger;
import java.util.List;

public record IndexerStatus(
        Long chainId,
        String registryAddress,
        String reputationRegistryAddress,
        String validationRegistryAddress,
        List<String> monitoredEventTopics,
        BigInteger startBlock,
        BigInteger checkpoint,
        BigInteger chainHead,
        BigInteger safeHead,
        BigInteger blocksIndexed,
        BigInteger blocksRemaining,
        double progressPercent,
        boolean caughtUp
) {
}

package agora3.indexer.api.dto;

import agora3.indexer.indexing.IndexerStatus;

import java.math.BigInteger;
import java.util.List;

public record IndexerStatusResponse(
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

    public static IndexerStatusResponse from(IndexerStatus status) {
        return new IndexerStatusResponse(
                status.chainId(),
                status.registryAddress(),
                status.reputationRegistryAddress(),
                status.validationRegistryAddress(),
                status.monitoredEventTopics(),
                status.startBlock(),
                status.checkpoint(),
                status.chainHead(),
                status.safeHead(),
                status.blocksIndexed(),
                status.blocksRemaining(),
                status.progressPercent(),
                status.caughtUp()
        );
    }
}

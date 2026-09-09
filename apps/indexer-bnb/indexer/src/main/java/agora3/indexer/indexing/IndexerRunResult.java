package agora3.indexer.indexing;

import java.math.BigInteger;

public record IndexerRunResult(
        String status,
        String message,
        Long chainId,
        BigInteger chainHead,
        BigInteger safeHead,
        BigInteger checkpointBefore,
        BigInteger checkpointAfter,
        BigInteger fromBlock,
        BigInteger toBlock,
        int logsFound
) {
    public static IndexerRunResult caughtUp(
            Long chainId,
            BigInteger chainHead,
            BigInteger safeHead,
            BigInteger checkpoint
    ) {
        return new IndexerRunResult(
                "CAUGHT_UP",
                "Indexer is up to date with the chain",
                chainId,
                chainHead,
                safeHead,
                checkpoint,
                checkpoint,
                null,
                null,
                0
        );
    }

    public static IndexerRunResult processed(
            Long chainId,
            BigInteger chainHead,
            BigInteger safeHead,
            BigInteger checkpointBefore,
            BigInteger fromBlock,
            BigInteger toBlock,
            int logsFound
    ) {
        return new IndexerRunResult(
                "PROCESSED",
                "Indexed block range successfully",
                chainId,
                chainHead,
                safeHead,
                checkpointBefore,
                toBlock,
                fromBlock,
                toBlock,
                logsFound
        );
    }
}

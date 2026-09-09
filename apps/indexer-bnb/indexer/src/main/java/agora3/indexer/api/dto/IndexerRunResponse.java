package agora3.indexer.api.dto;

import agora3.indexer.indexing.IndexerRunResult;

import java.math.BigInteger;

public record IndexerRunResponse(
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

    public static IndexerRunResponse from(IndexerRunResult result) {
        return new IndexerRunResponse(
                result.status(),
                result.message(),
                result.chainId(),
                result.chainHead(),
                result.safeHead(),
                result.checkpointBefore(),
                result.checkpointAfter(),
                result.fromBlock(),
                result.toBlock(),
                result.logsFound()
        );
    }
}

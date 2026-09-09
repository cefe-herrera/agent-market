package agora3.indexer.common.event;

import java.math.BigInteger;

public record ValidationRespondedEvent(
        Long chainId,
        BigInteger agentId,
        String validatorAddress,
        String requestHash,
        int response,
        String responseUri,
        String responseHash,
        String tag,
        String registryAddress,
        BigInteger blockNumber,
        String transactionHash
) {
}

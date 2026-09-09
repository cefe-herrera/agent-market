package agora3.indexer.common.event;

import java.math.BigInteger;

public record ValidationRequestedEvent(
        Long chainId,
        BigInteger agentId,
        String validatorAddress,
        String requestUri,
        String requestHash,
        String registryAddress,
        BigInteger blockNumber,
        String transactionHash
) {
}

package agora3.indexer.blockchain;

import java.math.BigInteger;
import java.util.List;

public record BlockchainLog(
        String address,
        List<String> topics,
        String data,
        BigInteger blockNumber,
        String transactionHash,
        String blockHash,
        int logIndex,
        boolean removed
) {
}

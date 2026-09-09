package agora3.indexer.blockchain;

import java.math.BigInteger;

public record BlockchainTransaction(
        String hash,
        String from,
        String to,
        BigInteger blockNumber
) {
}

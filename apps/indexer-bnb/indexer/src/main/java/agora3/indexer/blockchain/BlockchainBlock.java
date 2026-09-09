package agora3.indexer.blockchain;

import java.math.BigInteger;
import java.util.List;

public record BlockchainBlock(
        BigInteger number,
        String hash,
        String parentHash,
        BigInteger timestamp
) {
}

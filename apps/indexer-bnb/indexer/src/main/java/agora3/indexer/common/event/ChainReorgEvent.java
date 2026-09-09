package agora3.indexer.common.event;

import java.math.BigInteger;

public record ChainReorgEvent(
        Long chainId,
        BigInteger fromBlock
) {
}

package agora3.indexer.metadata;

import org.web3j.utils.Numeric;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

final class OnchainMetadataValueDecoder {

    private OnchainMetadataValueDecoder() {
    }

    static Optional<String> decodeWalletAddress(byte[] value) {
        if (value == null || value.length == 0) {
            return Optional.empty();
        }

        if (value.length == 20) {
            return Optional.of(Numeric.prependHexPrefix(Numeric.toHexString(value)));
        }

        String asString = new String(value, StandardCharsets.UTF_8).trim();
        if (asString.matches("(?i)0x[0-9a-fA-F]{40}")) {
            return Optional.of(asString);
        }

        return Optional.empty();
    }
}

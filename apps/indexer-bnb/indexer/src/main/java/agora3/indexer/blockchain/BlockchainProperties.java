package agora3.indexer.blockchain;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.ArrayList;
import java.util.List;

@Validated
@ConfigurationProperties(prefix = "blockchain")
public record BlockchainProperties(

        @NotBlank(message = "blockchain.rpc-url is required (set BLOCKCHAIN_RPC_URL)")
        String rpcUrl,

        @Positive(message = "blockchain.chain-id is required, e.g. 56 for BSC mainnet")
        long chainId,

        @Pattern(
                regexp = "0x[0-9a-fA-F]{40}",
                message = "blockchain.registry-address must be a 20-byte hex address"
        )
        String registryAddress,

        @Pattern(
                regexp = "^(|0x[0-9a-fA-F]{40})$",
                message = "blockchain.reputation-registry-address must be empty or a 20-byte hex address"
        )
        String reputationRegistryAddress,

        @Pattern(
                regexp = "^(|0x[0-9a-fA-F]{40})$",
                message = "blockchain.validation-registry-address must be empty or a 20-byte hex address"
        )
        String validationRegistryAddress,

        @PositiveOrZero
        long startBlock,

        /** Optional; defaults to {@link #startBlock()} when zero. */
        @PositiveOrZero
        long reputationStartBlock,

        /** Optional; defaults to {@link #startBlock()} when zero. */
        @PositiveOrZero
        long validationStartBlock,

        @Positive
        int batchSize,

        @Positive
        int maxLogRange,

        @Positive
        long pollIntervalMs,

        @PositiveOrZero
        int confirmationBlocks,

        boolean verifyBlocks
) {

    public boolean reputationEnabled() {
        return reputationRegistryAddress != null && !reputationRegistryAddress.isBlank();
    }

    public boolean validationEnabled() {
        return validationRegistryAddress != null && !validationRegistryAddress.isBlank();
    }

    public long effectiveReputationStartBlock() {
        return reputationStartBlock > 0 ? reputationStartBlock : startBlock;
    }

    public long effectiveValidationStartBlock() {
        return validationStartBlock > 0 ? validationStartBlock : startBlock;
    }

    public List<String> monitoredAddresses() {
        List<String> addresses = new ArrayList<>();
        addresses.add(registryAddress);
        if (reputationEnabled()) {
            addresses.add(reputationRegistryAddress);
        }
        if (validationEnabled()) {
            addresses.add(validationRegistryAddress);
        }
        return addresses;
    }
}

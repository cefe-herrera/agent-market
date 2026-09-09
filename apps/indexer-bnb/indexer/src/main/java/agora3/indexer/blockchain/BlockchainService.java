package agora3.indexer.blockchain;

import agora3.indexer.common.exception.BlockchainAuthException;
import agora3.indexer.common.exception.BlockchainRpcException;
import org.springframework.cloud.client.circuitbreaker.CircuitBreaker;
import org.springframework.cloud.client.circuitbreaker.CircuitBreakerFactory;
import org.springframework.stereotype.Service;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameter;
import org.web3j.protocol.core.methods.request.EthFilter;
import org.web3j.protocol.core.methods.response.EthBlock;
import org.web3j.protocol.core.methods.response.EthLog;
import org.web3j.protocol.core.methods.response.Log;

import org.web3j.protocol.exceptions.ClientConnectionException;

import java.io.IOException;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.function.Supplier;

@Service
public class BlockchainService {

    private final Web3j web3j;
    private final BlockchainProperties properties;
    private final CircuitBreaker circuitBreaker;

    public BlockchainService(
            Web3j web3j,
            BlockchainProperties properties,
            CircuitBreakerFactory<?, ?> circuitBreakerFactory
    ) {
        this.web3j = web3j;
        this.properties = properties;
        this.circuitBreaker = circuitBreakerFactory.create("blockchain");
    }

    public BigInteger getCurrentBlockNumber() {
        return execute(() -> {
            try {
                var response = web3j.ethBlockNumber().send();
                if (response.hasError()) {
                    throw rpcError("eth_blockNumber", response.getError().getMessage());
                }
                return response.getBlockNumber();
            } catch (IOException ex) {
                throw new BlockchainRpcException("Failed to fetch current block number", ex);
            }
        });
    }

    public BlockchainBlock getBlock(BigInteger blockNumber) {
        return execute(() -> {
            try {
                var response = web3j.ethGetBlockByNumber(
                        DefaultBlockParameter.valueOf(blockNumber),
                        false
                ).send();

                if (response.hasError()) {
                    throw rpcError("eth_getBlockByNumber", response.getError().getMessage());
                }

                EthBlock.Block block = response.getBlock();
                if (block == null) {
                    throw new BlockchainRpcException("Block not found: " + blockNumber);
                }

                return new BlockchainBlock(
                        block.getNumber(),
                        block.getHash(),
                        block.getParentHash(),
                        block.getTimestamp()
                );
            } catch (IOException ex) {
                throw new BlockchainRpcException("Failed to fetch block " + blockNumber, ex);
            }
        });
    }

    public List<BlockchainLog> getLogs(
            BigInteger fromBlock,
            BigInteger toBlock,
            List<String> addresses,
            List<String> topic0Options
    ) {
        return execute(() -> {
            int maxRange = Math.max(1, properties.maxLogRange());
            List<BlockchainLog> allLogs = new ArrayList<>();
            BigInteger chunkStart = fromBlock;

            while (chunkStart.compareTo(toBlock) <= 0) {
                BigInteger chunkEnd = chunkStart
                        .add(BigInteger.valueOf(maxRange - 1L))
                        .min(toBlock);
                allLogs.addAll(fetchLogsChunk(chunkStart, chunkEnd, addresses, topic0Options));
                chunkStart = chunkEnd.add(BigInteger.ONE);
            }

            return allLogs;
        });
    }

    private List<BlockchainLog> fetchLogsChunk(
            BigInteger fromBlock,
            BigInteger toBlock,
            List<String> addresses,
            List<String> topic0Options
    ) {
        try {
            EthFilter filter = new EthFilter(
                    DefaultBlockParameter.valueOf(fromBlock),
                    DefaultBlockParameter.valueOf(toBlock),
                    addresses
            );

            if (topic0Options != null && !topic0Options.isEmpty()) {
                filter.addOptionalTopics(topic0Options.toArray(String[]::new));
            }

            EthLog response = web3j.ethGetLogs(filter).send();

            if (response.hasError()) {
                throw rpcError(
                        "eth_getLogs",
                        response.getError().getMessage() + " (blocks " + fromBlock + "-" + toBlock + ")"
                );
            }

            List<EthLog.LogResult> logs = response.getLogs();
            if (logs == null || logs.isEmpty()) {
                return Collections.emptyList();
            }

            return logs.stream()
                    .map(log -> toBlockchainLog((Log) log.get()))
                    .toList();
        } catch (ClientConnectionException ex) {
            throw new BlockchainRpcException(
                    "eth_getLogs rejected by RPC (blocks " + fromBlock + "-" + toBlock + "): "
                            + ex.getMessage(),
                    ex
            );
        } catch (IOException ex) {
            throw new BlockchainRpcException(
                    "Failed to fetch logs from " + fromBlock + " to " + toBlock,
                    ex
            );
        }
    }

    private BlockchainRpcException rpcError(String method, String message) {
        return new BlockchainRpcException(method + " RPC error: " + message);
    }

    private <T> T execute(Supplier<T> supplier) {
        return circuitBreaker.run(supplier::get, throwable -> {
            if (isAuthFailure(throwable)) {
                throw new BlockchainAuthException(
                        "RPC provider rejected our credentials for " + redactedRpcUrl()
                                + ". The API key is invalid, revoked, or the plan quota is exhausted. "
                                + "Original response: " + rootMessage(throwable),
                        throwable
                );
            }
            if (throwable instanceof BlockchainRpcException rpcException) {
                throw rpcException;
            }
            throw new BlockchainRpcException(
                    "Blockchain RPC call failed: " + throwable.getMessage(),
                    throwable
            );
        });
    }

    private boolean isAuthFailure(Throwable throwable) {
        for (Throwable current = throwable; current != null; current = current.getCause()) {
            String message = current.getMessage();
            if (message == null) {
                continue;
            }
            if (message.contains("401")
                    || message.contains("403")
                    || message.contains("Must be authenticated")
                    || message.contains("invalid api key")) {
                return true;
            }
            if (current.getCause() == current) {
                break;
            }
        }
        return false;
    }

    private String rootMessage(Throwable throwable) {
        Throwable current = throwable;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        return current.getMessage();
    }

    /**
     * Keeps the provider host in the message while hiding the API key that lives in the URL path.
     */
    private String redactedRpcUrl() {
        String url = properties.rpcUrl();
        if (url == null) {
            return "<unset>";
        }
        int schemeEnd = url.indexOf("://");
        int pathStart = url.indexOf('/', schemeEnd < 0 ? 0 : schemeEnd + 3);
        return pathStart < 0 ? url : url.substring(0, pathStart) + "/***";
    }

    private BlockchainLog toBlockchainLog(Log log) {
        return new BlockchainLog(
                log.getAddress(),
                log.getTopics(),
                log.getData(),
                log.getBlockNumber(),
                log.getTransactionHash(),
                log.getBlockHash(),
                log.getLogIndex().intValue(),
                Boolean.TRUE.equals(log.isRemoved())
        );
    }
}

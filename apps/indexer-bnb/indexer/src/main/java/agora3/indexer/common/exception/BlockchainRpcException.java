package agora3.indexer.common.exception;

public class BlockchainRpcException extends IndexerException {

    public BlockchainRpcException(String message) {
        super(message);
    }

    public BlockchainRpcException(String message, Throwable cause) {
        super(message, cause);
    }
}

package agora3.indexer.common.exception;

/**
 * Raised when the RPC provider rejects our credentials (HTTP 401/403). Unlike a timeout or a
 * rate limit, this never recovers on its own, so callers should stop retrying and surface it.
 */
public class BlockchainAuthException extends BlockchainRpcException {

    public BlockchainAuthException(String message, Throwable cause) {
        super(message, cause);
    }
}

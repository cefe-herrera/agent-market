package agora3.indexer.metadata;

import org.springframework.stereotype.Service;

@Service
public class IpfsService {

    private final MetadataProperties properties;

    public IpfsService(MetadataProperties properties) {
        this.properties = properties;
    }

    public String resolveToHttp(String uri) {
        if (uri == null || uri.isBlank()) {
            return uri;
        }
        if (uri.startsWith("ipfs://")) {
            return properties.ipfsGateway() + uri.substring("ipfs://".length());
        }
        return uri;
    }
}

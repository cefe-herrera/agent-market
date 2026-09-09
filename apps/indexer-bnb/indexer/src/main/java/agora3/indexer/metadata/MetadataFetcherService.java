package agora3.indexer.metadata;

import agora3.indexer.common.exception.MetadataFetchException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;

@Configuration
@EnableConfigurationProperties(MetadataProperties.class)
class MetadataConfig {

    @Bean
    WebClient metadataWebClient(MetadataProperties properties) {
        return WebClient.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(2 * 1024 * 1024))
                .build();
    }
}

@Service
class MetadataFetcherService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final WebClient webClient;
    private final IpfsService ipfsService;
    private final MetadataProperties properties;

    MetadataFetcherService(WebClient metadataWebClient, IpfsService ipfsService, MetadataProperties properties) {
        this.webClient = metadataWebClient;
        this.ipfsService = ipfsService;
        this.properties = properties;
    }

    @SuppressWarnings("unchecked")
    Map<String, Object> fetch(String metadataUri) {
        if (metadataUri != null && metadataUri.startsWith("data:")) {
            return parseDataUri(metadataUri);
        }

        String url = ipfsService.resolveToHttp(metadataUri);
        try {
            return webClient.get()
                    .uri(url)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(Duration.ofSeconds(properties.fetchTimeoutSeconds()));
        } catch (Exception ex) {
            throw new MetadataFetchException("Failed to fetch metadata from " + url, ex);
        }
    }

    private Map<String, Object> parseDataUri(String metadataUri) {
        try {
            int commaIndex = metadataUri.indexOf(',');
            if (commaIndex < 0) {
                throw new MetadataFetchException("Invalid data URI: " + metadataUri);
            }

            String header = metadataUri.substring(5, commaIndex);
            String payload = metadataUri.substring(commaIndex + 1);

            String json = header.contains(";base64")
                    ? new String(Base64.getDecoder().decode(payload), StandardCharsets.UTF_8)
                    : payload;

            return OBJECT_MAPPER.readValue(json, new TypeReference<>() {});
        } catch (MetadataFetchException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new MetadataFetchException("Failed to parse data URI metadata", ex);
        }
    }
}

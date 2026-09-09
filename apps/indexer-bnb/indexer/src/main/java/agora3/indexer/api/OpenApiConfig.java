package agora3.indexer.api;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI indexerOpenApi(@Value("${server.port:8080}") int serverPort) {
        return new OpenAPI()
                .info(new Info()
                        .title("Agora Indexer API")
                        .description("ERC-8004 agent indexer — agents, rankings, feedback, validations and indexer control.")
                        .version("v1"))
                .addServersItem(new Server()
                        .url("http://localhost:" + serverPort)
                        .description("Local"));
    }
}

package agora3.indexer.api;

import agora3.indexer.agents.AgentService;
import agora3.indexer.api.dto.AgentResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/search")
@Tag(name = "Search", description = "PostgreSQL full-text and trigram search over indexed agents")
public class SearchController {

    private final AgentService agentService;

    public SearchController(AgentService agentService) {
        this.agentService = agentService;
    }

    @GetMapping
    public Page<AgentResponse> search(
            @RequestParam(required = false) String q,
            Pageable pageable
    ) {
        return agentService.search(q, pageable).map(AgentResponse::from);
    }
}

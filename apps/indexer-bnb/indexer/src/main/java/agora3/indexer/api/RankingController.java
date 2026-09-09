package agora3.indexer.api;

import agora3.indexer.api.dto.RankingResponse;
import agora3.indexer.ranking.RankingService;
import agora3.indexer.ranking.RankingType;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/rankings")
@Tag(name = "Rankings", description = "Materialized agent rankings (TRUSTED, TRENDING, …)")
public class RankingController {

    private final RankingService rankingService;

    public RankingController(RankingService rankingService) {
        this.rankingService = rankingService;
    }

    @GetMapping
    public List<RankingResponse> findByType(@RequestParam(defaultValue = "TRUSTED") RankingType type) {
        return rankingService.findByType(type).stream()
                .map(RankingResponse::from)
                .toList();
    }
}

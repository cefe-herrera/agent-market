package agora3.indexer.api;

import agora3.indexer.activity.ActivityService;
import agora3.indexer.agents.AgentService;
import agora3.indexer.api.dto.ActivityResponse;
import agora3.indexer.api.dto.AgentDetailResponse;
import agora3.indexer.api.dto.AgentResponse;
import agora3.indexer.api.dto.FeedbackResponse;
import agora3.indexer.api.dto.ReputationResponse;
import agora3.indexer.api.dto.ValidationRequestResponse;
import agora3.indexer.metadata.MetadataService;
import agora3.indexer.reputation.FeedbackService;
import agora3.indexer.reputation.ReputationService;
import agora3.indexer.validation.ValidationService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/agents")
@Tag(name = "Agents", description = "Registered ERC-8004 agents, metadata, activity, reputation, feedback and validations")
public class AgentController {

    private final AgentService agentService;
    private final MetadataService metadataService;
    private final ActivityService activityService;
    private final ReputationService reputationService;
    private final FeedbackService feedbackService;
    private final ValidationService validationService;

    public AgentController(
            AgentService agentService,
            MetadataService metadataService,
            ActivityService activityService,
            ReputationService reputationService,
            FeedbackService feedbackService,
            ValidationService validationService
    ) {
        this.agentService = agentService;
        this.metadataService = metadataService;
        this.activityService = activityService;
        this.reputationService = reputationService;
        this.feedbackService = feedbackService;
        this.validationService = validationService;
    }

    @GetMapping
    public Page<AgentResponse> findAll(Pageable pageable) {
        return agentService.findAll(pageable).map(AgentResponse::from);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AgentDetailResponse> findById(@PathVariable UUID id) {
        return agentService.findById(id)
                .map(agent -> ResponseEntity.ok(AgentDetailResponse.from(
                        agent,
                        metadataService.findByAgentId(id).orElse(null)
                )))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/activity")
    public ResponseEntity<Page<ActivityResponse>> findActivity(
            @PathVariable UUID id,
            Pageable pageable
    ) {
        return agentService.findById(id)
                .map(agent -> ResponseEntity.ok(
                        activityService.findByAgentId(id, pageable).map(ActivityResponse::from)
                ))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/reputation")
    public ResponseEntity<ReputationResponse> findReputation(@PathVariable UUID id) {
        return agentService.findById(id)
                .map(agent -> ResponseEntity.ok(
                        reputationService.findByAgentId(id)
                                .map(ReputationResponse::from)
                                .orElseGet(() -> ReputationResponse.empty(id))
                ))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/feedback")
    public ResponseEntity<List<FeedbackResponse>> findFeedback(@PathVariable UUID id) {
        return agentService.findById(id)
                .map(agent -> ResponseEntity.ok(
                        feedbackService.findByAgentId(id).stream()
                                .map(FeedbackResponse::from)
                                .toList()
                ))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/validations")
    public ResponseEntity<List<ValidationRequestResponse>> findValidations(@PathVariable UUID id) {
        return agentService.findById(id)
                .map(agent -> ResponseEntity.ok(
                        validationService.findRequestsByAgentId(id).stream()
                                .map(request -> ValidationRequestResponse.from(
                                        request,
                                        validationService.findResponsesByRequestId(request.getId())
                                ))
                                .toList()
                ))
                .orElse(ResponseEntity.notFound().build());
    }
}

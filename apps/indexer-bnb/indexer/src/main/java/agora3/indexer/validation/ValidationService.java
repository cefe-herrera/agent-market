package agora3.indexer.validation;

import agora3.indexer.agents.AgentService;
import agora3.indexer.common.event.ValidationRequestedEvent;
import agora3.indexer.common.event.ValidationRespondedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ValidationService {

    private static final Logger log = LoggerFactory.getLogger(ValidationService.class);

    private final AgentValidationRequestRepository requestRepository;
    private final AgentValidationResponseRepository responseRepository;
    private final AgentService agentService;

    public ValidationService(
            AgentValidationRequestRepository requestRepository,
            AgentValidationResponseRepository responseRepository,
            AgentService agentService
    ) {
        this.requestRepository = requestRepository;
        this.responseRepository = responseRepository;
        this.agentService = agentService;
    }

    @Transactional
    public void recordRequest(ValidationRequestedEvent event) {
        String requestHash = normalizeHash(event.requestHash());
        if (requestRepository.findByChainIdAndRequestHash(event.chainId(), requestHash).isPresent()) {
            return;
        }

        var agent = agentService.findByChainIdAndOnchainId(event.chainId(), event.agentId());
        if (agent.isEmpty()) {
            log.debug("Validation request for unknown agent {} on chain {}", event.agentId(), event.chainId());
            return;
        }

        requestRepository.save(AgentValidationRequest.fromEvent(agent.get().getId(), event));
    }

    @Transactional
    public void recordResponse(ValidationRespondedEvent event) {
        String requestHash = normalizeHash(event.requestHash());
        var request = requestRepository.findByChainIdAndRequestHash(event.chainId(), requestHash);
        if (request.isEmpty()) {
            log.debug("Validation response without request hash {}", requestHash);
            return;
        }

        UUID requestId = request.get().getId();
        String tag = event.tag() == null ? "" : event.tag();
        if (responseRepository.findByRequestIdAndTag(requestId, tag).isPresent()) {
            return;
        }

        responseRepository.save(AgentValidationResponse.fromEvent(requestId, event));
    }

    public List<AgentValidationRequest> findRequestsByAgentId(UUID agentId) {
        return requestRepository.findByAgentIdOrderByCreatedAtDesc(agentId);
    }

    public List<AgentValidationResponse> findResponsesByRequestId(UUID requestId) {
        return responseRepository.findByRequestIdOrderByCreatedAtDesc(requestId);
    }

    @Transactional
    public void rollbackFromBlock(Long chainId, java.math.BigInteger fromBlock) {
        responseRepository.deleteFromBlock(fromBlock);
        requestRepository.deleteByChainIdAndBlockNumberGreaterThanEqual(chainId, fromBlock);
    }

    private String normalizeHash(String hash) {
        return hash == null ? null : hash.toLowerCase();
    }
}

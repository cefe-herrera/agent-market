package agora3.indexer.agents;

import agora3.indexer.common.event.AgentCreatedEvent;
import agora3.indexer.common.event.AgentRegisteredEvent;
import agora3.indexer.common.event.AgentTransferredEvent;
import agora3.indexer.common.event.AgentUriUpdatedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class AgentService {

    private final AgentRepository agentRepository;
    private final ApplicationEventPublisher eventPublisher;

    public AgentService(AgentRepository agentRepository, ApplicationEventPublisher eventPublisher) {
        this.agentRepository = agentRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public Agent create(AgentRegisteredEvent event) {
        Optional<Agent> existing = agentRepository.findByChainIdAndOnchainId(event.chainId(), event.agentId());
        if (existing.isPresent()) {
            return existing.get();
        }

        Agent agent = agentRepository.save(Agent.fromRegistration(event));
        eventPublisher.publishEvent(new AgentCreatedEvent(
                agent.getId(),
                agent.getChainId(),
                agent.getOnchainId(),
                agent.getMetadataUri(),
                agent.getCreatedBlock(),
                agent.getTransactionHash()
        ));
        return agent;
    }

    public Page<Agent> findAll(Pageable pageable) {
        return agentRepository.findAll(pageable);
    }

    public Page<Agent> search(String query, Pageable pageable) {
        if (query == null || query.isBlank()) {
            return findAll(pageable);
        }
        Pageable searchPage = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        String sanitized = sanitizeSearchQuery(query.trim());
        if (sanitized.isBlank()) {
            return findAll(pageable);
        }
        return agentRepository.searchByText(sanitized, toTsQuery(sanitized), searchPage);
    }

    private static String sanitizeSearchQuery(String query) {
        return query.replaceAll("[^\\p{L}\\p{N}\\s._@-]", " ").trim();
    }

    private static String toTsQuery(String query) {
        if (query.isBlank()) {
            return "";
        }
        return java.util.Arrays.stream(query.split("\\s+"))
                .filter(token -> !token.isBlank())
                .map(token -> token + ":*")
                .reduce((left, right) -> left + " & " + right)
                .orElse("");
    }

    public Optional<Agent> findById(UUID id) {
        return agentRepository.findById(id);
    }

    public Optional<Agent> findByChainIdAndOnchainId(Long chainId, java.math.BigInteger onchainId) {
        return agentRepository.findByChainIdAndOnchainId(chainId, onchainId);
    }

    @Transactional
    public void updateMetadataUri(AgentUriUpdatedEvent event) {
        agentRepository.findByChainIdAndOnchainId(event.chainId(), event.agentId()).ifPresent(agent -> {
            agent.setMetadataUri(event.newUri());
            agentRepository.save(agent);
        });
    }

    @Transactional
    public void updateOwner(AgentTransferredEvent event) {
        agentRepository.findByChainIdAndOnchainId(event.chainId(), event.agentId()).ifPresent(agent -> {
            agent.setOwnerAddress(event.toAddress());
            agentRepository.save(agent);
        });
    }

    @Transactional
    public void updateAgentWallet(Long chainId, java.math.BigInteger onchainId, String walletAddress) {
        agentRepository.findByChainIdAndOnchainId(chainId, onchainId).ifPresent(agent -> {
            agent.setAgentWalletAddress(walletAddress);
            agentRepository.save(agent);
        });
    }

    @Transactional
    public void updateProfile(UUID agentId, String name, String description) {
        agentRepository.findById(agentId).ifPresent(agent -> {
            if (name != null) {
                agent.setName(name);
            }
            if (description != null) {
                agent.setDescription(description);
            }
            agentRepository.save(agent);
        });
    }

    @Transactional
    public void rollbackFromBlock(Long chainId, java.math.BigInteger fromBlock) {
        agentRepository.deleteByChainIdAndCreatedBlockGreaterThanEqual(chainId, fromBlock);
    }
}

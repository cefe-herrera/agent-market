package agora3.indexer.indexing;

import agora3.indexer.blockchain.BlockchainLog;
import agora3.indexer.blockchain.BlockchainProperties;
import agora3.indexer.blockchain.ContractEventDecoder;
import agora3.indexer.common.event.AgentMetadataSetEvent;
import agora3.indexer.common.event.AgentRegisteredEvent;
import agora3.indexer.common.event.AgentTransferredEvent;
import agora3.indexer.common.event.AgentUriUpdatedEvent;
import agora3.indexer.common.event.FeedbackReceivedEvent;
import agora3.indexer.common.event.FeedbackResponseAppendedEvent;
import agora3.indexer.common.event.FeedbackRevokedEvent;
import agora3.indexer.common.event.ValidationRequestedEvent;
import agora3.indexer.common.event.ValidationRespondedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Service
public class LogProcessorService {

    private static final Logger log = LoggerFactory.getLogger(LogProcessorService.class);

    private final ContractEventDecoder contractEventDecoder;
    private final BlockchainProperties properties;
    private final ApplicationEventPublisher eventPublisher;
    private final ProcessedLogService processedLogService;

    public LogProcessorService(
            ContractEventDecoder contractEventDecoder,
            BlockchainProperties properties,
            ApplicationEventPublisher eventPublisher,
            ProcessedLogService processedLogService
    ) {
        this.contractEventDecoder = contractEventDecoder;
        this.properties = properties;
        this.eventPublisher = eventPublisher;
        this.processedLogService = processedLogService;
    }

    public void processLogs(java.util.List<BlockchainLog> logs) {
        for (BlockchainLog chainLog : logs) {
            if (chainLog.removed()) {
                continue;
            }

            if (processedLogService.alreadyProcessed(properties.chainId(), chainLog)) {
                continue;
            }

            if (isIdentityRegistry(chainLog.address())) {
                processIdentityLog(chainLog);
            } else if (isReputationRegistry(chainLog.address())) {
                processReputationLog(chainLog);
            } else if (isValidationRegistry(chainLog.address())) {
                processValidationLog(chainLog);
            }

            processedLogService.markProcessed(properties.chainId(), chainLog);
        }
    }

    private void processIdentityLog(BlockchainLog chainLog) {
        contractEventDecoder.decodeAgentRegistered(chainLog).ifPresent(decoded -> {
            log.info("Registered: agentId={} owner={}", decoded.agentId(), decoded.owner());
            eventPublisher.publishEvent(new AgentRegisteredEvent(
                    properties.chainId(),
                    decoded.agentId(),
                    decoded.owner(),
                    decoded.metadataUri(),
                    properties.registryAddress(),
                    chainLog.blockNumber(),
                    chainLog.transactionHash(),
                    java.time.Instant.now()
            ));
        });

        contractEventDecoder.decodeUriUpdated(chainLog).ifPresent(decoded -> {
            log.info("URIUpdated: agentId={}", decoded.agentId());
            eventPublisher.publishEvent(new AgentUriUpdatedEvent(
                    properties.chainId(),
                    decoded.agentId(),
                    decoded.newUri(),
                    decoded.updatedBy(),
                    properties.registryAddress(),
                    chainLog.blockNumber(),
                    chainLog.transactionHash()
            ));
        });

        contractEventDecoder.decodeTransfer(chainLog).ifPresent(decoded -> {
            log.info("Transfer: agentId={} to={}", decoded.tokenId(), decoded.to());
            eventPublisher.publishEvent(new AgentTransferredEvent(
                    properties.chainId(),
                    decoded.tokenId(),
                    decoded.from(),
                    decoded.to(),
                    properties.registryAddress(),
                    chainLog.blockNumber(),
                    chainLog.transactionHash()
            ));
        });

        contractEventDecoder.decodeMetadataSet(chainLog).ifPresent(decoded -> {
            log.info("MetadataSet: agentId={} key={}", decoded.agentId(), decoded.metadataKey());
            eventPublisher.publishEvent(new AgentMetadataSetEvent(
                    properties.chainId(),
                    decoded.agentId(),
                    decoded.metadataKey(),
                    decoded.metadataValue(),
                    properties.registryAddress(),
                    chainLog.blockNumber(),
                    chainLog.transactionHash()
            ));
        });
    }

    private void processReputationLog(BlockchainLog chainLog) {
        if (chainLog.blockNumber().longValue() < properties.effectiveReputationStartBlock()) {
            return;
        }

        contractEventDecoder.decodeNewFeedback(chainLog).ifPresent(decoded -> {
            log.info("NewFeedback: agentId={} client={} index={}", decoded.agentId(), decoded.clientAddress(), decoded.feedbackIndex());
            eventPublisher.publishEvent(new FeedbackReceivedEvent(
                    properties.chainId(),
                    decoded.agentId(),
                    decoded.clientAddress(),
                    decoded.feedbackIndex(),
                    decoded.value(),
                    decoded.valueDecimals(),
                    decoded.tag1(),
                    decoded.tag2(),
                    decoded.endpoint(),
                    decoded.feedbackUri(),
                    decoded.feedbackHash(),
                    properties.reputationRegistryAddress(),
                    chainLog.blockNumber(),
                    chainLog.transactionHash()
            ));
        });

        contractEventDecoder.decodeFeedbackRevoked(chainLog).ifPresent(decoded -> {
            log.info("FeedbackRevoked: agentId={} index={}", decoded.agentId(), decoded.feedbackIndex());
            eventPublisher.publishEvent(new FeedbackRevokedEvent(
                    properties.chainId(),
                    decoded.agentId(),
                    decoded.clientAddress(),
                    decoded.feedbackIndex(),
                    properties.reputationRegistryAddress(),
                    chainLog.blockNumber(),
                    chainLog.transactionHash()
            ));
        });

        contractEventDecoder.decodeResponseAppended(chainLog).ifPresent(decoded -> {
            log.info("ResponseAppended: agentId={} index={}", decoded.agentId(), decoded.feedbackIndex());
            eventPublisher.publishEvent(new FeedbackResponseAppendedEvent(
                    properties.chainId(),
                    decoded.agentId(),
                    decoded.clientAddress(),
                    decoded.feedbackIndex(),
                    decoded.responder(),
                    decoded.responseUri(),
                    decoded.responseHash(),
                    properties.reputationRegistryAddress(),
                    chainLog.blockNumber(),
                    chainLog.transactionHash()
            ));
        });
    }

    private void processValidationLog(BlockchainLog chainLog) {
        if (chainLog.blockNumber().longValue() < properties.effectiveValidationStartBlock()) {
            return;
        }

        contractEventDecoder.decodeValidationRequest(chainLog).ifPresent(decoded -> {
            log.info("ValidationRequest: agentId={} validator={}", decoded.agentId(), decoded.validatorAddress());
            eventPublisher.publishEvent(new ValidationRequestedEvent(
                    properties.chainId(),
                    decoded.agentId(),
                    decoded.validatorAddress(),
                    decoded.requestUri(),
                    decoded.requestHash(),
                    properties.validationRegistryAddress(),
                    chainLog.blockNumber(),
                    chainLog.transactionHash()
            ));
        });

        contractEventDecoder.decodeValidationResponse(chainLog).ifPresent(decoded -> {
            log.info("ValidationResponse: agentId={} score={}", decoded.agentId(), decoded.response());
            eventPublisher.publishEvent(new ValidationRespondedEvent(
                    properties.chainId(),
                    decoded.agentId(),
                    decoded.validatorAddress(),
                    decoded.requestHash(),
                    decoded.response(),
                    decoded.responseUri(),
                    decoded.responseHash(),
                    decoded.tag(),
                    properties.validationRegistryAddress(),
                    chainLog.blockNumber(),
                    chainLog.transactionHash()
            ));
        });
    }

    private boolean isIdentityRegistry(String address) {
        return properties.registryAddress().equalsIgnoreCase(address);
    }

    private boolean isReputationRegistry(String address) {
        return properties.reputationEnabled()
                && properties.reputationRegistryAddress().equalsIgnoreCase(address);
    }

    private boolean isValidationRegistry(String address) {
        return properties.validationEnabled()
                && properties.validationRegistryAddress().equalsIgnoreCase(address);
    }
}

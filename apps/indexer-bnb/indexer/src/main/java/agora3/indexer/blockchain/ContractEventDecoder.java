package agora3.indexer.blockchain;

import org.springframework.stereotype.Component;
import org.web3j.abi.EventEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.DynamicBytes;
import org.web3j.abi.datatypes.Event;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Bytes32;
import org.web3j.abi.datatypes.generated.Int128;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.abi.datatypes.generated.Uint64;
import org.web3j.abi.datatypes.generated.Uint8;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.util.List;
import java.util.Optional;

@Component
public class ContractEventDecoder {

    private static final Event REGISTERED = new Event(
            "Registered",
            List.of(
                    new TypeReference<Uint256>(true) {},
                    new TypeReference<Utf8String>(false) {},
                    new TypeReference<Address>(true) {}
            )
    );

    private static final Event URI_UPDATED = new Event(
            "URIUpdated",
            List.of(
                    new TypeReference<Uint256>(true) {},
                    new TypeReference<Utf8String>(false) {},
                    new TypeReference<Address>(true) {}
            )
    );

    private static final Event TRANSFER = new Event(
            "Transfer",
            List.of(
                    new TypeReference<Address>(true) {},
                    new TypeReference<Address>(true) {},
                    new TypeReference<Uint256>(true) {}
            )
    );

    private static final Event METADATA_SET = new Event(
            "MetadataSet",
            List.of(
                    new TypeReference<Uint256>(true) {},
                    new TypeReference<Utf8String>(true) {},
                    new TypeReference<Utf8String>(false) {},
                    new TypeReference<DynamicBytes>(false) {}
            )
    );

    private static final Event NEW_FEEDBACK = new Event(
            "NewFeedback",
            List.of(
                    new TypeReference<Uint256>(true) {},
                    new TypeReference<Address>(true) {},
                    new TypeReference<Uint64>(false) {},
                    new TypeReference<Int128>(false) {},
                    new TypeReference<Uint8>(false) {},
                    new TypeReference<Utf8String>(true) {},
                    new TypeReference<Utf8String>(false) {},
                    new TypeReference<Utf8String>(false) {},
                    new TypeReference<Utf8String>(false) {},
                    new TypeReference<Utf8String>(false) {},
                    new TypeReference<Bytes32>(false) {}
            )
    );

    private static final Event FEEDBACK_REVOKED = new Event(
            "FeedbackRevoked",
            List.of(
                    new TypeReference<Uint256>(true) {},
                    new TypeReference<Address>(true) {},
                    new TypeReference<Uint64>(true) {}
            )
    );

    private static final Event RESPONSE_APPENDED = new Event(
            "ResponseAppended",
            List.of(
                    new TypeReference<Uint256>(true) {},
                    new TypeReference<Address>(true) {},
                    new TypeReference<Uint64>(false) {},
                    new TypeReference<Address>(true) {},
                    new TypeReference<Utf8String>(false) {},
                    new TypeReference<Bytes32>(false) {}
            )
    );

    private static final Event VALIDATION_REQUEST = new Event(
            "ValidationRequest",
            List.of(
                    new TypeReference<Address>(true) {},
                    new TypeReference<Uint256>(true) {},
                    new TypeReference<Utf8String>(false) {},
                    new TypeReference<Bytes32>(true) {}
            )
    );

    private static final Event VALIDATION_RESPONSE = new Event(
            "ValidationResponse",
            List.of(
                    new TypeReference<Address>(true) {},
                    new TypeReference<Uint256>(true) {},
                    new TypeReference<Bytes32>(true) {},
                    new TypeReference<Uint8>(false) {},
                    new TypeReference<Utf8String>(false) {},
                    new TypeReference<Bytes32>(false) {},
                    new TypeReference<Utf8String>(false) {}
            )
    );

    private final String registeredTopic;
    private final String uriUpdatedTopic;
    private final String transferTopic;
    private final String metadataSetTopic;
    private final String newFeedbackTopic;
    private final String feedbackRevokedTopic;
    private final String responseAppendedTopic;
    private final String validationRequestTopic;
    private final String validationResponseTopic;
    private final List<String> identityTopics;
    private final List<String> reputationTopics;
    private final List<String> validationTopics;

    public ContractEventDecoder() {
        this.registeredTopic = EventEncoder.encode(REGISTERED);
        this.uriUpdatedTopic = EventEncoder.encode(URI_UPDATED);
        this.transferTopic = EventEncoder.encode(TRANSFER);
        this.metadataSetTopic = EventEncoder.encode(METADATA_SET);
        this.newFeedbackTopic = EventEncoder.encode(NEW_FEEDBACK);
        this.feedbackRevokedTopic = EventEncoder.encode(FEEDBACK_REVOKED);
        this.responseAppendedTopic = EventEncoder.encode(RESPONSE_APPENDED);
        this.validationRequestTopic = EventEncoder.encode(VALIDATION_REQUEST);
        this.validationResponseTopic = EventEncoder.encode(VALIDATION_RESPONSE);

        this.identityTopics = List.of(
                registeredTopic,
                uriUpdatedTopic,
                transferTopic,
                metadataSetTopic
        );
        this.reputationTopics = List.of(
                newFeedbackTopic,
                feedbackRevokedTopic,
                responseAppendedTopic
        );
        this.validationTopics = List.of(
                validationRequestTopic,
                validationResponseTopic
        );
    }

    public String agentRegisteredTopic() {
        return registeredTopic;
    }

    public List<String> identityEventTopics() {
        return identityTopics;
    }

    public List<String> reputationEventTopics() {
        return reputationTopics;
    }

    public List<String> allEventTopics(boolean reputationEnabled, boolean validationEnabled) {
        List<String> topics = new java.util.ArrayList<>(identityTopics);
        if (reputationEnabled) {
            topics.addAll(reputationTopics);
        }
        if (validationEnabled) {
            topics.addAll(validationTopics);
        }
        return topics;
    }

    public Optional<DecodedAgentRegistered> decodeAgentRegistered(BlockchainLog log) {
        if (!matchesTopic(log, registeredTopic)) {
            return Optional.empty();
        }
        if (log.topics().size() < 3) {
            return Optional.empty();
        }

        BigInteger agentId = Numeric.toBigInt(log.topics().get(1));
        String owner = decodeAddressTopic(log.topics().get(2));
        String agentUri = decodeString(log.data(), REGISTERED.getNonIndexedParameters());

        return Optional.of(new DecodedAgentRegistered(agentId, owner, agentUri));
    }

    public Optional<DecodedUriUpdated> decodeUriUpdated(BlockchainLog log) {
        if (!matchesTopic(log, uriUpdatedTopic) || log.topics().size() < 3) {
            return Optional.empty();
        }

        BigInteger agentId = Numeric.toBigInt(log.topics().get(1));
        String updatedBy = decodeAddressTopic(log.topics().get(2));
        String newUri = decodeString(log.data(), URI_UPDATED.getNonIndexedParameters());

        return Optional.of(new DecodedUriUpdated(agentId, newUri, updatedBy));
    }

    public Optional<DecodedTransfer> decodeTransfer(BlockchainLog log) {
        if (!matchesTopic(log, transferTopic) || log.topics().size() < 4) {
            return Optional.empty();
        }

        String from = decodeAddressTopic(log.topics().get(1));
        String to = decodeAddressTopic(log.topics().get(2));
        BigInteger tokenId = Numeric.toBigInt(log.topics().get(3));

        return Optional.of(new DecodedTransfer(from, to, tokenId));
    }

    public Optional<DecodedMetadataSet> decodeMetadataSet(BlockchainLog log) {
        if (!matchesTopic(log, metadataSetTopic) || log.topics().size() < 2) {
            return Optional.empty();
        }

        BigInteger agentId = Numeric.toBigInt(log.topics().get(1));
        List<Type> decoded = FunctionReturnDecoder.decode(log.data(), METADATA_SET.getNonIndexedParameters());
        if (decoded.size() < 2) {
            return Optional.empty();
        }

        String metadataKey = ((Utf8String) decoded.get(0)).getValue();
        byte[] metadataValue = ((DynamicBytes) decoded.get(1)).getValue();

        return Optional.of(new DecodedMetadataSet(agentId, metadataKey, metadataValue));
    }

    public Optional<DecodedNewFeedback> decodeNewFeedback(BlockchainLog log) {
        if (!matchesTopic(log, newFeedbackTopic) || log.topics().size() < 3) {
            return Optional.empty();
        }

        BigInteger agentId = Numeric.toBigInt(log.topics().get(1));
        String clientAddress = decodeAddressTopic(log.topics().get(2));

        List<Type> decoded = FunctionReturnDecoder.decode(log.data(), NEW_FEEDBACK.getNonIndexedParameters());
        if (decoded.size() < 8) {
            return Optional.empty();
        }

        long feedbackIndex = ((Uint64) decoded.get(0)).getValue().longValue();
        BigInteger value = ((Int128) decoded.get(1)).getValue();
        int valueDecimals = ((Uint8) decoded.get(2)).getValue().intValue();
        String tag1 = ((Utf8String) decoded.get(3)).getValue();
        String tag2 = ((Utf8String) decoded.get(4)).getValue();
        String endpoint = ((Utf8String) decoded.get(5)).getValue();
        String feedbackUri = ((Utf8String) decoded.get(6)).getValue();
        String feedbackHash = Numeric.toHexString(((Bytes32) decoded.get(7)).getValue());

        return Optional.of(new DecodedNewFeedback(
                agentId,
                clientAddress,
                feedbackIndex,
                value,
                valueDecimals,
                tag1,
                tag2,
                endpoint,
                feedbackUri,
                feedbackHash
        ));
    }

    public Optional<DecodedFeedbackRevoked> decodeFeedbackRevoked(BlockchainLog log) {
        if (!matchesTopic(log, feedbackRevokedTopic) || log.topics().size() < 4) {
            return Optional.empty();
        }

        BigInteger agentId = Numeric.toBigInt(log.topics().get(1));
        String clientAddress = decodeAddressTopic(log.topics().get(2));
        long feedbackIndex = Numeric.toBigInt(log.topics().get(3)).longValue();

        return Optional.of(new DecodedFeedbackRevoked(agentId, clientAddress, feedbackIndex));
    }

    public Optional<DecodedResponseAppended> decodeResponseAppended(BlockchainLog log) {
        if (!matchesTopic(log, responseAppendedTopic) || log.topics().size() < 4) {
            return Optional.empty();
        }

        BigInteger agentId = Numeric.toBigInt(log.topics().get(1));
        String clientAddress = decodeAddressTopic(log.topics().get(2));
        String responder = decodeAddressTopic(log.topics().get(3));

        List<Type> decoded = FunctionReturnDecoder.decode(log.data(), RESPONSE_APPENDED.getNonIndexedParameters());
        if (decoded.size() < 3) {
            return Optional.empty();
        }

        long feedbackIndex = ((Uint64) decoded.get(0)).getValue().longValue();
        String responseUri = ((Utf8String) decoded.get(1)).getValue();
        String responseHash = Numeric.toHexString(((Bytes32) decoded.get(2)).getValue());

        return Optional.of(new DecodedResponseAppended(
                agentId,
                clientAddress,
                feedbackIndex,
                responder,
                responseUri,
                responseHash
        ));
    }

    public List<String> validationEventTopics() {
        return validationTopics;
    }

    public Optional<DecodedValidationRequest> decodeValidationRequest(BlockchainLog log) {
        if (!matchesTopic(log, validationRequestTopic) || log.topics().size() < 4) {
            return Optional.empty();
        }

        String validatorAddress = decodeAddressTopic(log.topics().get(1));
        BigInteger agentId = Numeric.toBigInt(log.topics().get(2));
        String requestHash = log.topics().get(3);
        String requestUri = decodeString(log.data(), VALIDATION_REQUEST.getNonIndexedParameters());

        return Optional.of(new DecodedValidationRequest(
                validatorAddress,
                agentId,
                requestUri,
                requestHash
        ));
    }

    public Optional<DecodedValidationResponse> decodeValidationResponse(BlockchainLog log) {
        if (!matchesTopic(log, validationResponseTopic) || log.topics().size() < 4) {
            return Optional.empty();
        }

        String validatorAddress = decodeAddressTopic(log.topics().get(1));
        BigInteger agentId = Numeric.toBigInt(log.topics().get(2));
        String requestHash = log.topics().get(3);

        List<Type> decoded = FunctionReturnDecoder.decode(log.data(), VALIDATION_RESPONSE.getNonIndexedParameters());
        if (decoded.size() < 4) {
            return Optional.empty();
        }

        int response = ((Uint8) decoded.get(0)).getValue().intValue();
        String responseUri = ((Utf8String) decoded.get(1)).getValue();
        String responseHash = Numeric.toHexString(((Bytes32) decoded.get(2)).getValue());
        String tag = ((Utf8String) decoded.get(3)).getValue();

        return Optional.of(new DecodedValidationResponse(
                validatorAddress,
                agentId,
                requestHash,
                response,
                responseUri,
                responseHash,
                tag
        ));
    }

    private boolean matchesTopic(BlockchainLog log, String expectedTopic) {
        return !log.topics().isEmpty() && expectedTopic.equalsIgnoreCase(log.topics().getFirst());
    }

    private String decodeAddressTopic(String topic) {
        String value = Numeric.cleanHexPrefix(topic);
        return "0x" + value.substring(value.length() - 40);
    }

    private String decodeString(String data, List<TypeReference<Type>> parameters) {
        List<Type> decoded = FunctionReturnDecoder.decode(data, parameters);
        if (decoded.isEmpty()) {
            return "";
        }
        return ((Utf8String) decoded.getFirst()).getValue();
    }

    public record DecodedAgentRegistered(
            BigInteger agentId,
            String owner,
            String metadataUri
    ) {
    }

    public record DecodedUriUpdated(
            BigInteger agentId,
            String newUri,
            String updatedBy
    ) {
    }

    public record DecodedTransfer(
            String from,
            String to,
            BigInteger tokenId
    ) {
    }

    public record DecodedMetadataSet(
            BigInteger agentId,
            String metadataKey,
            byte[] metadataValue
    ) {
    }

    public record DecodedNewFeedback(
            BigInteger agentId,
            String clientAddress,
            long feedbackIndex,
            BigInteger value,
            int valueDecimals,
            String tag1,
            String tag2,
            String endpoint,
            String feedbackUri,
            String feedbackHash
    ) {
    }

    public record DecodedFeedbackRevoked(
            BigInteger agentId,
            String clientAddress,
            long feedbackIndex
    ) {
    }

    public record DecodedResponseAppended(
            BigInteger agentId,
            String clientAddress,
            long feedbackIndex,
            String responder,
            String responseUri,
            String responseHash
    ) {
    }

    public record DecodedValidationRequest(
            String validatorAddress,
            BigInteger agentId,
            String requestUri,
            String requestHash
    ) {
    }

    public record DecodedValidationResponse(
            String validatorAddress,
            BigInteger agentId,
            String requestHash,
            int response,
            String responseUri,
            String responseHash,
            String tag
    ) {
    }
}

package agora3.indexer.api.dto;

import agora3.indexer.validation.AgentValidationRequest;
import agora3.indexer.validation.AgentValidationResponse;

import java.math.BigInteger;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ValidationRequestResponse(
        UUID id,
        String validatorAddress,
        String requestHash,
        String requestUri,
        BigInteger blockNumber,
        String transactionHash,
        Instant createdAt,
        List<ValidationResponseItem> responses
) {

    public static ValidationRequestResponse from(
            AgentValidationRequest request,
            List<AgentValidationResponse> responses
    ) {
        return new ValidationRequestResponse(
                request.getId(),
                request.getValidatorAddress(),
                request.getRequestHash(),
                request.getRequestUri(),
                request.getBlockNumber(),
                request.getTransactionHash(),
                request.getCreatedAt(),
                responses.stream().map(ValidationResponseItem::from).toList()
        );
    }

    public record ValidationResponseItem(
            UUID id,
            String validatorAddress,
            int response,
            String responseUri,
            String responseHash,
            String tag,
            BigInteger blockNumber,
            String transactionHash,
            Instant createdAt
    ) {

        public static ValidationResponseItem from(AgentValidationResponse response) {
            return new ValidationResponseItem(
                    response.getId(),
                    response.getValidatorAddress(),
                    response.getResponse(),
                    response.getResponseUri(),
                    response.getResponseHash(),
                    response.getTag(),
                    response.getBlockNumber(),
                    response.getTransactionHash(),
                    response.getCreatedAt()
            );
        }
    }
}

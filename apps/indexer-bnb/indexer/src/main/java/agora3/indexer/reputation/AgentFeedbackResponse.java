package agora3.indexer.reputation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigInteger;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "agent_feedback_responses")
public class AgentFeedbackResponse {

    @Id
    private UUID id;

    @Column(name = "feedback_id", nullable = false)
    private UUID feedbackId;

    @Column(name = "responder_address", nullable = false, length = 42)
    private String responderAddress;

    @Column(name = "response_uri")
    private String responseUri;

    @Column(name = "response_hash", length = 66)
    private String responseHash;

    @Column(name = "block_number", nullable = false)
    private BigInteger blockNumber;

    @Column(name = "transaction_hash", nullable = false, length = 66)
    private String transactionHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AgentFeedbackResponse() {
    }

    public static AgentFeedbackResponse fromEvent(
            UUID feedbackId,
            agora3.indexer.common.event.FeedbackResponseAppendedEvent event
    ) {
        AgentFeedbackResponse response = new AgentFeedbackResponse();
        response.id = UUID.randomUUID();
        response.feedbackId = feedbackId;
        response.responderAddress = event.responderAddress();
        response.responseUri = event.responseUri();
        response.responseHash = event.responseHash();
        response.blockNumber = event.blockNumber();
        response.transactionHash = event.transactionHash();
        response.createdAt = Instant.now();
        return response;
    }
}

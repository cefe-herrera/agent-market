package agora3.indexer.validation;

import agora3.indexer.common.event.ValidationRequestedEvent;
import agora3.indexer.common.event.ValidationRespondedEvent;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

@Component
public class ValidationEventListener {

    private final ValidationService validationService;

    public ValidationEventListener(ValidationService validationService) {
        this.validationService = validationService;
    }

    @ApplicationModuleListener
    public void onValidationRequested(ValidationRequestedEvent event) {
        validationService.recordRequest(event);
    }

    @ApplicationModuleListener
    public void onValidationResponded(ValidationRespondedEvent event) {
        validationService.recordResponse(event);
    }
}

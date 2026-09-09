package agora3.indexer.validation;

import agora3.indexer.common.event.ChainReorgEvent;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

@Component
public class ValidationReorgListener {

    private final ValidationService validationService;

    public ValidationReorgListener(ValidationService validationService) {
        this.validationService = validationService;
    }

    @ApplicationModuleListener
    public void onChainReorg(ChainReorgEvent event) {
        validationService.rollbackFromBlock(event.chainId(), event.fromBlock());
    }
}

@org.springframework.modulith.ApplicationModule(
        type = org.springframework.modulith.ApplicationModule.Type.OPEN,
        allowedDependencies = {"common", "agents", "metadata", "ranking", "activity", "indexing", "reputation", "validation"}
)
package agora3.indexer.api;

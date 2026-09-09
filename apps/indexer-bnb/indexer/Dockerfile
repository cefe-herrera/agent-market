# ERC-8004 indexer (Spring Boot / Java 21) — Coolify / Docker
# Coolify: Base Directory = apps/indexer-bnb/indexer

FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /app

COPY mvnw mvnw.cmd ./
COPY .mvn .mvn
COPY pom.xml ./

RUN chmod +x mvnw \
 && ./mvnw -B -DskipTests dependency:go-offline

COPY src ./src

RUN ./mvnw -B -DskipTests package \
 && cp target/indexer-*.jar /app/indexer.jar

FROM eclipse-temurin:21-jre-jammy AS runtime

RUN groupadd --system indexer \
 && useradd --system --gid indexer --home-dir /app indexer

WORKDIR /app

COPY --from=builder /app/indexer.jar ./indexer.jar
RUN chown -R indexer:indexer /app

USER indexer

ENV SPRING_PROFILES_ACTIVE=dev
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/indexer.jar --server.address=0.0.0.0 --server.port=${PORT:-8080}"]

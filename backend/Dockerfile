FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /workspace

# Cache dependency resolution separately so source edits do not redownload all dependencies.
COPY pom.xml ./pom.xml
RUN mvn --batch-mode --no-transfer-progress dependency:go-offline

COPY src ./src
RUN mvn --batch-mode --no-transfer-progress -DskipTests package

FROM eclipse-temurin:21-jre-alpine AS runtime

WORKDIR /app

RUN addgroup -S spring \
    && adduser -S spring -G spring \
    && mkdir -p /app/storage/media \
    && chown -R spring:spring /app

COPY --from=build --chown=spring:spring \
    /workspace/target/hilling-0.0.1-SNAPSHOT.jar /app/app.jar

ENV SERVER_PORT=8080 \
    MEDIA_STORAGE_DIR=/app/storage/media \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0"

EXPOSE 8080
VOLUME ["/app/storage/media"]

USER spring:spring
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

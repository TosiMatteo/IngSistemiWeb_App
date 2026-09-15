# ---- Stage 1: build del jar con Gradle ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace

# Copia prima i file di build per sfruttare la cache dei layer Docker
COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies > /dev/null

COPY src src
RUN ./gradlew --no-daemon bootJar -x test

# ---- Stage 2: immagine di runtime leggera ----
FROM eclipse-temurin:21-jre
WORKDIR /app

ENV TZ=Europe/Rome \
    UPLOAD_DIR=/app/uploads \
    JAVA_OPTS=""

RUN groupadd --system spring && useradd --system --gid spring spring \
    && mkdir -p /app/uploads && chown -R spring:spring /app

COPY --from=build --chown=spring:spring /workspace/build/libs/app.jar app.jar

USER spring
EXPOSE 8080
VOLUME ["/app/uploads"]

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Duser.timezone=Europe/Rome -jar /app/app.jar"]

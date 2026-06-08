FROM eclipse-temurin:21-jdk AS build

WORKDIR /app

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
COPY src src

RUN chmod +x ./mvnw && ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /app/target/backend-spring-0.0.1-SNAPSHOT.jar app.jar

ENV PORT=3333

EXPOSE 3333

ENTRYPOINT ["java", "-jar", "app.jar"]

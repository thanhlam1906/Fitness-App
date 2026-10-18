# syntax=docker/dockerfile:1.7
# Image backend production (doc/design-trien-khai-v1.md §4). Build nhiều tầng: tầng cuối chỉ có JRE và
# file jar, không có mã nguồn, Gradle hay thư mục build (image công khai trên GHCR, bẫy 1.1).
# Compose dev không dùng file này: dev chạy `gradle bootRun` trên mã nguồn gắn từ máy.
FROM eclipse-temurin:21.0.12.1_1-jdk-noble AS build
WORKDIR /src
# Git lưu gradlew mode 644: build từ Windows thì Docker Desktop tự cho quyền chạy, còn runner Linux của CI
# checkout ra 644 thì ./gradlew báo Permission denied. Gán quyền ngay lúc chép.
COPY --chmod=755 gradlew ./
COPY settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
COPY src src
# Cache thư mục Gradle giữa các lần build trên cùng máy: build lại không tải lại Gradle và thư viện.
RUN --mount=type=cache,target=/root/.gradle ./gradlew bootJar --no-daemon -q && cp build/libs/*.jar /app.jar

FROM eclipse-temurin:21.0.12.1_1-jre-noble
# Không chạy bằng root. uid 1000 trùng analyzer: hai bên cùng ghi và xoá trong thư mục clip /data
# (volume dùng chung, bẫy 1.11). Volume mới rỗng được Docker chép thư mục này từ image vào.
RUN mkdir /data && chown 1000:1000 /data
COPY --from=build /app.jar /app/app.jar
USER 1000:1000
EXPOSE 8080
# Heap theo giới hạn RAM của container (mem_limit trong compose), không -Xmx cứng: phần ngoài heap
# (metaspace, stack luồng) cần khoảng 35% còn lại, vượt là container bị giết (bẫy 1.2).
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=65", "-jar", "/app/app.jar"]

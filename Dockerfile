# Multi-stage Dockerfile para Easy Parking
# Stage 1: Build Frontend
FROM node:14-alpine AS frontend-builder
WORKDIR /app/frontend

# Copiar package.json e instalar dependências
COPY front-end/package*.json ./
RUN npm ci --production

# Copiar fonte e fazer build
COPY front-end/ .
RUN npm run build

# Stage 2: Build Backend
FROM maven:3.8.1-openjdk-8 AS backend-builder
WORKDIR /app/backend

# Download de dependências
COPY back-end/pom.xml .
RUN mvn dependency:go-offline

# Build
COPY back-end/ .
RUN mvn clean package -DskipTests -q

# Stage 3: Runtime
FROM openjdk:8-jdk-alpine
WORKDIR /app

# Instalar curl para healthcheck
RUN apk add --no-cache curl

# Criar diretórios
RUN mkdir -p /app/public/assets /var/log/app

# Copiar JAR do backend
COPY --from=backend-builder /app/backend/target/aesy-parking-back-1.0-SNAPSHOT.jar app.jar

# Copiar frontend build para ser servido pelo backend
COPY --from=frontend-builder /app/frontend/dist/easy-parking/ /app/public/

# Adicionar script de startup
RUN echo '#!/bin/sh\n\
exec java \\\n\
  -Dspring.profiles.active=prod \\\n\
  -Dspring.datasource.url="jdbc:mysql://${MYSQL_IP}:${MYSQL_PORT:3306}/${MYSQL_DB}" \\\n\
  -Dspring.datasource.username="${MYSQL_USER}" \\\n\
  -Dspring.datasource.password="${MYSQL_PASSWORD}" \\\n\
  -Dspring.mail.host="${MAIL_HOST}" \\\n\
  -Dspring.mail.port="${MAIL_PORT}" \\\n\
  -Dspring.mail.username="${MAIL_USERNAME}" \\\n\
  -Dspring.mail.password="${MAIL_PASSWORD}" \\\n\
  -Dpagbank.email="${PAGBANK_EMAIL}" \\\n\
  -Dpagbank.token="${PAGBANK_TOKEN}" \\\n\
  -Dpagbank.notification_url="${PAGBANK_NOTIFICATION_URL}" \\\n\
  -Dpix.key="${PIX_KEY}" \\\n\
  -jar app.jar\
' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Expor porta
EXPOSE 8080

# Health check - testa a API
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

# Entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

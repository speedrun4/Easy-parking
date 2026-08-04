# Guia de Deployment - Easy Parking em Produção (Google Cloud)

## 📋 Pré-requisitos

1. **Google Cloud Account** - Criar em https://cloud.google.com/
2. **Google Cloud SDK** - Instalar em https://cloud.google.com/sdk/docs/install
3. **Docker** - Instalar em https://www.docker.com/
4. **Node.js + NPM** - Para build do frontend
5. **Java JDK 8+** - Para build do backend
6. **Maven** - Já deve estar incluído no projeto

---

## 🚀 Passo 1: Criar Projeto no Google Cloud

### 1.1 Acessar Google Cloud Console
```bash
# Fazer login
gcloud auth login

# Criar novo projeto
gcloud projects create easy-parking-prod --name="Easy Parking Production"

# Definir como projeto ativo
gcloud config set project easy-parking-prod
```

### 1.2 Ativar APIs Necessárias
```bash
# Cloud Run (para rodar a aplicação)
gcloud services enable run.googleapis.com

# Cloud SQL (para MySQL)
gcloud services enable sqladmin.googleapis.com

# Cloud Build (para CI/CD)
gcloud services enable cloudbuild.googleapis.com

# Artifact Registry (para armazenar imagens Docker)
gcloud services enable artifactregistry.googleapis.com

# Container Registry (alternativa mais simples)
gcloud services enable containerregistry.googleapis.com
```

---

## 🗄️ Passo 2: Criar Banco de Dados MySQL

### 2.1 Criar Instância Cloud SQL MySQL
```bash
gcloud sql instances create easy-parking-mysql \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --availability-type=REGIONAL

# Esperar a instância ser criada (~5-10 minutos)
```

### 2.2 Criar Banco de Dados
```bash
gcloud sql databases create easyparking --instance=easy-parking-mysql

# Criar usuário com senha
gcloud sql users create parking \
  --instance=easy-parking-mysql \
  --password=SuaSenhaForte123!
```

### 2.3 Obter IP Público da Instância
```bash
gcloud sql instances describe easy-parking-mysql --format='value(ipAddresses[0].ipAddress)'
# Salve este IP para usar na variável de ambiente
```

### 2.4 Permitir Conexão do Cloud Run
```bash
# Obter o IP da instância SQL
MYSQL_IP=$(gcloud sql instances describe easy-parking-mysql \
  --format='value(ipAddresses[0].ipAddress)')

# Adicionar regra de firewall para Cloud Run
gcloud sql instances patch easy-parking-mysql \
  --add-management-flags "authorized-networks=${MYSQL_IP}/32"
```

---

## 🐳 Passo 3: Preparar Aplicação para Produção

### 3.1 Criar arquivo de configuração de produção

Crie o arquivo `back-end/src/main/resources/application-prod.properties`:

```properties
# Spring Boot Production Config
spring.profiles.active=prod
server.port=8080

# Database Configuration
spring.datasource.url=jdbc:mysql://MYSQL_IP:3306/easyparking
spring.datasource.username=parking
spring.datasource.password=SUA_SENHA_FORTE
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA Configuration
spring.jpa.database-platform=org.hibernate.dialect.MySQL8Dialect
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.format_sql=true

# Email Configuration (usar variáveis de ambiente)
spring.mail.host=${MAIL_HOST}
spring.mail.port=${MAIL_PORT}
spring.mail.username=${MAIL_USERNAME}
spring.mail.password=${MAIL_PASSWORD}
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
spring.mail.properties.mail.smtp.starttls.required=true

# PagBank Configuration
pagbank.sandbox=false
pagbank.email=${PAGBANK_EMAIL}
pagbank.token=${PAGBANK_TOKEN}
pagbank.client_id=${PAGBANK_CLIENT_ID}
pagbank.client_secret=${PAGBANK_CLIENT_SECRET}
pagbank.notification_url=${PAGBANK_NOTIFICATION_URL}
pix.key=${PIX_KEY}

# CORS Configuration
server.servlet.context-path=/
spring.web.cors.allowed-origins=https://seu-dominio.com,https://www.seu-dominio.com
spring.web.cors.allowed-methods=*
spring.web.cors.allowed-headers=*

# Logging
logging.level.root=INFO
logging.level.org.springframework.web=INFO
logging.file.name=/var/log/app/easy-parking.log
```

### 3.2 Criar arquivo .env.example (para referência)

Crie `.env.example` na raiz do projeto:

```env
# Google Cloud Configuration
GCP_PROJECT_ID=easy-parking-prod
GCP_REGION=us-central1

# Database
MYSQL_IP=seu-ip-aqui
MYSQL_PORT=3306
MYSQL_USER=parking
MYSQL_PASSWORD=SuaSenhaForte123!
MYSQL_DB=easyparking

# Email Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=seu-email@gmail.com
MAIL_PASSWORD=sua-senha-app-gmail

# PagBank
PAGBANK_EMAIL=seu-email@gmail.com
PAGBANK_TOKEN=seu-token-aqui
PAGBANK_CLIENT_ID=seu-client-id
PAGBANK_CLIENT_SECRET=seu-client-secret
PAGBANK_NOTIFICATION_URL=https://seu-dominio.com/api/pagbank/notifications
PIX_KEY=seu-email@gmail.com
```

---

## 🐋 Passo 4: Build e Containerização

### 4.1 Criar Dockerfile

Crie `Dockerfile` na raiz do projeto:

```dockerfile
# Stage 1: Build Frontend
FROM node:14-alpine AS frontend-builder
WORKDIR /app/frontend
COPY front-end/package*.json ./
RUN npm install
COPY front-end/ .
RUN npm run build

# Stage 2: Build Backend
FROM maven:3.8.1-openjdk-8 AS backend-builder
WORKDIR /app/backend
COPY back-end/pom.xml .
RUN mvn dependency:go-offline
COPY back-end/ .
RUN mvn clean package -DskipTests

# Stage 3: Runtime
FROM openjdk:8-jdk-alpine
WORKDIR /app

# Copiar o JAR do backend
COPY --from=backend-builder /app/backend/target/*.jar app.jar

# Copiar o build do frontend para ser servido pelo backend
RUN mkdir -p /app/public/assets
COPY --from=frontend-builder /app/frontend/dist/* /app/public/

# Expor porta
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

# Comando de inicialização
ENTRYPOINT ["java", "-jar", "app.jar", "--spring.config.location=classpath:application-prod.properties"]
```

### 4.2 Build da Imagem Docker

```bash
# Configurar Docker para usar Google Cloud
gcloud auth configure-docker

# Build da imagem
docker build -t gcr.io/easy-parking-prod/easy-parking:latest .

# Push para Google Container Registry
docker push gcr.io/easy-parking-prod/easy-parking:latest
```

---

## ☁️ Passo 5: Deploy no Cloud Run

### 5.1 Deploy da Aplicação

```bash
# Deploy da imagem
gcloud run deploy easy-parking \
  --image gcr.io/easy-parking-prod/easy-parking:latest \
  --platform managed \
  --region us-central1 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 3600 \
  --max-instances 10 \
  --allow-unauthenticated

# Salve a URL gerada
```

### 5.2 Configurar Variáveis de Ambiente

```bash
gcloud run services update easy-parking \
  --update-env-vars=SPRING_PROFILES_ACTIVE=prod \
  --update-env-vars=MYSQL_IP=SEU_IP_AQUI \
  --update-env-vars=MAIL_HOST=smtp.gmail.com \
  --update-env-vars=MAIL_PORT=587 \
  --update-env-vars=MAIL_USERNAME=seu-email@gmail.com \
  --update-env-vars=MAIL_PASSWORD=sua-senha-app \
  --update-env-vars=PAGBANK_EMAIL=seu-email@gmail.com \
  --update-env-vars=PAGBANK_TOKEN=seu-token \
  --update-env-vars=PAGBANK_NOTIFICATION_URL=https://easy-parking.run.app/api/pagbank/notifications \
  --region us-central1
```

### 5.3 Permitir Cloud Run Conectar ao Cloud SQL

```bash
# Obter o VPC Connector default (ou criar um se necessário)
gcloud run services update easy-parking \
  --vpc-connector=projects/easy-parking-prod/locations/us-central1/connectors/default \
  --region us-central1
```

---

## 🌐 Passo 6: Configurar Domínio Customizado (Opcional)

### 6.1 Apontar DNS
```bash
# Obter IP do Cloud Run
gcloud run services describe easy-parking --region us-central1 --format='value(status.address.url)'

# Configurar no seu provedor de DNS
# Criar um CNAME para seu domínio apontando para o Cloud Run
```

### 6.2 Configurar SSL Certificate
```bash
gcloud run services update easy-parking \
  --update-env-vars=CORS_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com \
  --region us-central1
```

---

## 🔍 Passo 7: Verificar Deploy

### 7.1 Testar a Aplicação
```bash
# Obter URL do Cloud Run
CLOUD_RUN_URL=$(gcloud run services describe easy-parking \
  --region us-central1 \
  --format='value(status.address.url)')

# Testar health check
curl ${CLOUD_RUN_URL}/api/health

# Testar frontend
curl ${CLOUD_RUN_URL}
```

### 7.2 Ver Logs
```bash
gcloud run services logs read easy-parking --region us-central1 --limit 50
```

### 7.3 Ver Métricas
```bash
# No Google Cloud Console:
# Cloud Run > easy-parking > Logs > Metrics
```

---

## 🔐 Passo 8: Segurança e Produção

### 8.1 Ativar Cloud Armor (DDoS Protection)
```bash
# Criar security policy
gcloud compute security-policies create easy-parking-security \
  --description "Easy Parking Security Policy"

# Adicionar regras de rate limiting
gcloud compute security-policies rules create 100 \
  --security-policy=easy-parking-security \
  --action "rate-based-ban" \
  --rate-limit-options \
    enforce-on-key="IP" \
    ban-duration-sec=600 \
    conform-action="allow" \
    exceed-action="deny-429" \
    rate-limit-threshold-count=100 \
    rate-limit-threshold-interval-sec=60
```

### 8.2 Configurar Backup do Banco
```bash
# Ativar backup automático
gcloud sql backups create \
  --instance=easy-parking-mysql \
  --description="Manual backup"

# Configurar backup automático (via Console GUI)
# Cloud SQL > easy-parking-mysql > Backups
```

### 8.3 Monitoramento com Cloud Monitoring
```bash
# Criar alertas para CPU e Memória
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="Easy Parking - High Memory Usage" \
  --condition-display-name="Memory > 80%" \
  --condition-threshold-value=0.8
```

---

## 📊 Passo 9: CI/CD com Cloud Build (Opcional mas Recomendado)

### 9.1 Criar arquivo cloudbuild.yaml

Crie `cloudbuild.yaml` na raiz:

```yaml
steps:
  # Build da imagem Docker
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/easy-parking:$SHORT_SHA', '.']

  # Push para Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/easy-parking:$SHORT_SHA']

  # Deploy no Cloud Run
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - run
      - --filename=k8s/
      - --image=gcr.io/$PROJECT_ID/easy-parking:$SHORT_SHA
      - --location=us-central1

images:
  - 'gcr.io/$PROJECT_ID/easy-parking:$SHORT_SHA'

options:
  machineType: 'N1_HIGHCPU_8'
```

### 9.2 Conectar GitHub/GitLab com Cloud Build
```bash
# Via Google Cloud Console:
# Cloud Build > Triggers > Connect Repository
```

---

## 🆘 Troubleshooting

### Problema: Erro de Conexão com Banco
```bash
# Verificar conectividade
gcloud sql connect easy-parking-mysql --user=parking

# Verificar VPC Connector
gcloud compute networks vpc-access connectors list --region us-central1
```

### Problema: Arquivo estático não encontrado
```bash
# Verificar se o frontend foi buildado corretamente
gcloud run services logs read easy-parking --region us-central1 --limit 100 | grep -i "static"
```

### Problema: Timeout na requisição
```bash
# Aumentar timeout do Cloud Run
gcloud run services update easy-parking \
  --timeout 3600 \
  --region us-central1
```

---

## 📈 Monitoramento Contínuo

### Via Google Cloud Console
1. Cloud Run > easy-parking > Logs
2. Cloud Run > easy-parking > Metrics
3. Cloud SQL > easy-parking-mysql > Monitoring

### Via CLI
```bash
# Logs em tempo real
gcloud run services logs read easy-parking --follow --region us-central1

# Revisar erros dos últimos 30 minutos
gcloud run services logs read easy-parking \
  --region us-central1 \
  --filter='severity>=ERROR' \
  --limit 50
```

---

## 🔄 Atualizar Aplicação

Após fazer mudanças no código:

```bash
# 1. Rebuild da imagem
docker build -t gcr.io/easy-parking-prod/easy-parking:v1.1 .

# 2. Push
docker push gcr.io/easy-parking-prod/easy-parking:v1.1

# 3. Deploy na nova versão
gcloud run deploy easy-parking \
  --image gcr.io/easy-parking-prod/easy-parking:v1.1 \
  --region us-central1
```

---

## 💾 Backup e Recuperação

```bash
# Criar backup do banco
gcloud sql backups create \
  --instance=easy-parking-mysql \
  --description="Pre-deployment backup"

# Listar backups
gcloud sql backups list --instance=easy-parking-mysql

# Restaurar de um backup (atenção: destrutuivo)
gcloud sql backups restore BACKUP_ID \
  --backup-instance=easy-parking-mysql \
  --backup-configuration=automatic
```

---

## 🎯 Checklist Final de Produção

- [ ] Banco de dados MySQL criado e testado
- [ ] Variáveis de ambiente configuradas
- [ ] CORS configurado para o domínio correto
- [ ] SSL/TLS ativado
- [ ] Backup automático do banco configurado
- [ ] Monitoramento e alertas ativados
- [ ] Cloud Armor (proteção DDoS) ativado
- [ ] Logs centralizados configurados
- [ ] Teste de recuperação de backup realizado
- [ ] Documentação de runbook criada
- [ ] Escalonamento automático configurado
- [ ] Health checks funcionando

---

## 📞 Suporte e Próximas Etapas

1. Testar aplicação em staging antes de produção
2. Configurar email de alertas
3. Implementar logging estruturado (Stackdriver)
4. Configurar autoscaling baseado em CPU/Memória
5. Setup de disaster recovery

Para mais informações: https://cloud.google.com/docs

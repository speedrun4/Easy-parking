# Guia de Deployment - Easy Parking em Produção (AWS Free Tier)

## 📋 Pré-requisitos

1. **AWS Account** - Criar em https://aws.amazon.com/
2. **AWS CLI** - Instalar em https://aws.amazon.com/cli/
3. **Docker** - Instalar em https://www.docker.com/
4. **Node.js + NPM** - Para build do frontend
5. **Java JDK 8+** - Para build do backend
6. **Maven** - Já deve estar incluído no projeto

---

## 🚀 Passo 1: Criar Conta AWS Free Tier

### 1.1 Criar Conta
```bash
# Acesse: https://aws.amazon.com/
# Clique em "Criar conta"
# Preencha com seus dados
# Confirme email e telefone
```

### 1.2 Verificar Free Tier
- Acessar https://console.aws.amazon.com/
- Canto superior direito → Sua conta
- Confirmar "Free Tier" está ativo

---

## 🔐 Passo 2: Criar Usuário IAM e Access Key

### 2.1 Criar Usuário IAM (Segurança)
```bash
# No Console AWS:
# 1. IAM > Usuários > Criar usuário
# 2. Nome: easy-parking-deploy
# 3. Marcar: "Acesso programático"
# 4. Permissões: EC2, RDS, ECR, ECS
# 5. Baixar CSV com Access Key ID e Secret Access Key
```

### 2.2 Instalar AWS CLI
**Windows:**
```bash
# Baixar: https://aws.amazon.com/cli/
# Ou via Chocolatey:
choco install awscli
```

**Linux/Mac:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### 2.3 Configurar AWS CLI
```bash
aws configure

# Informar:
# AWS Access Key ID: [copiar do CSV]
# AWS Secret Access Key: [copiar do CSV]
# Default region: us-east-1
# Default output format: json
```

---

## 🗄️ Passo 3: Criar Banco de Dados MySQL RDS

### 3.1 Criar Instância RDS
```bash
# No Console AWS:
# 1. RDS > Bancos de dados > Criar banco
# 2. Engine: MySQL 8.0
# 3. Classes: db.t3.micro (Free Tier)
# 4. Identificador: easy-parking-mysql
# 5. Master username: parking
# 6. Master password: ParkingAWS123456!
# 7. Alocação de armazenamento: 20 GB (Free Tier)
# 8. Multi-AZ: Não (economizar créditos)
# 9. Backup: 7 dias
# 10. Criar
```

### 3.2 Criar Banco de Dados
```bash
# No Console RDS:
# 1. Bancos de dados > easy-parking-mysql
# 2. Conectividade e segurança > copiar Endpoint
# 3. Guardar para usar depois
```

### 3.3 Conectar e Criar Banco
```bash
# Use MySQL Workbench ou CLI:
mysql -h <RDS-ENDPOINT> -u parking -p

# Criar banco
CREATE DATABASE easyparking;
USE easyparking;

# Pronto!
```

---

## 🐳 Passo 4: Preparar Aplicação

### 4.1 Criar arquivo application-prod.properties

**Localização:** `back-end/src/main/resources/application-prod.properties`

```properties
# Spring Boot Production Config
spring.profiles.active=prod
server.port=8080

# Database Configuration
spring.datasource.url=jdbc:mysql://${MYSQL_HOST}:${MYSQL_PORT:3306}/${MYSQL_DB:easyparking}
spring.datasource.username=${MYSQL_USER:parking}
spring.datasource.password=${MYSQL_PASSWORD:password}
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=2

# JPA Configuration
spring.jpa.database-platform=org.hibernate.dialect.MySQL8Dialect
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false

# Email Configuration
spring.mail.host=${MAIL_HOST:smtp.gmail.com}
spring.mail.port=${MAIL_PORT:587}
spring.mail.username=${MAIL_USERNAME:}
spring.mail.password=${MAIL_PASSWORD:}
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
app.mail.enabled=true

# PagBank Configuration
pagbank.sandbox=false
pagbank.email=${PAGBANK_EMAIL:}
pagbank.token=${PAGBANK_TOKEN:}
pagbank.notification_url=${PAGBANK_NOTIFICATION_URL:}
pix.key=${PIX_KEY:}

# CORS Configuration
spring.web.cors.allowed-origins=${CORS_ORIGINS:*}
spring.web.cors.allowed-methods=*
spring.web.cors.allow-credentials=true

# Logging
logging.level.root=INFO
logging.level.org.springframework.web=INFO
logging.file.name=/var/log/app/easy-parking.log

# Application Config
spring.main.allow-circular-references=true
spring.application.name=easy-parking
```

### 4.2 Atualizar .env para AWS

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012  # Seu Account ID

# RDS MySQL Configuration
MYSQL_HOST=easy-parking-mysql.c123456.us-east-1.rds.amazonaws.com
MYSQL_PORT=3306
MYSQL_USER=parking
MYSQL_PASSWORD=ParkingAWS123456!
MYSQL_DB=easyparking

# Email Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=seu-email@gmail.com
MAIL_PASSWORD=sua-senha-de-app

# PagBank Configuration
PAGBANK_EMAIL=seu-email@gmail.com
PAGBANK_TOKEN=seu-token-pagbank
PAGBANK_NOTIFICATION_URL=https://seu-app.com/api/pagbank/notifications
PIX_KEY=seu-email@gmail.com

# CORS Configuration
CORS_ORIGINS=https://seu-app.com,https://www.seu-app.com

# Application Configuration
SPRING_PROFILES_ACTIVE=prod
JAVA_OPTS=-Xmx1G -Xms512m
```

---

## ☁️ Passo 5: Deploy com EC2 (Mais Simples)

### 5.1 Criar Instância EC2
```bash
# No Console AWS:
# 1. EC2 > Instâncias > Executar Instância
# 2. AMI: Amazon Linux 2 (Free Tier eligible)
# 3. Tipo: t3.micro (Free Tier)
# 4. Rede: VPC padrão
# 5. Storage: 30 GB (Free Tier)
# 6. Security Group: Criar novo
#    - SSH: porta 22 (sua IP)
#    - HTTP: porta 80 (0.0.0.0/0)
#    - HTTPS: porta 443 (0.0.0.0/0)
#    - TCP 8080: porta 8080 (0.0.0.0/0)
# 7. Criar e baixar key pair (easy-parking.pem)
```

### 5.2 Conectar à Instância
```bash
# Windows (PowerShell):
# 1. Ir para pasta com easy-parking.pem
# 2. Dar permissão:
icacls easy-parking.pem /inheritance:r /grant:r "$($env:USERNAME):(F)"

# 3. Conectar via SSH:
ssh -i easy-parking.pem ec2-user@seu-instancia-ip

# Linux/Mac:
chmod 400 easy-parking.pem
ssh -i easy-parking.pem ec2-user@seu-instancia-ip
```

### 5.3 Instalar Docker e Java
```bash
# Na instância EC2 (via SSH):

# Atualizar sistema
sudo yum update -y

# Instalar Docker
sudo yum install docker -y
sudo systemctl start docker
sudo usermod -aG docker ec2-user

# Instalar Java 8
sudo yum install java-1.8.0-openjdk -y
java -version

# Instalar Maven
sudo yum install maven -y
mvn -version

# Instalar Node.js (opcional)
curl https://rpm.nodesource.com/setup_14.x | sudo bash
sudo yum install nodejs -y
```

### 5.4 Clonar Repositório e Fazer Build
```bash
# Na instância EC2:

# Clonar repo
git clone https://github.com/seu-usuario/easy-parking.git
cd easy-parking

# Build do Frontend
cd front-end
npm install
npm run build
cd ..

# Build do Backend
cd back-end
mvn clean package -DskipTests
cd ..

# Build Docker
docker build -t easy-parking:latest .

# Rodar Docker
docker run -d -p 8080:8080 \
  -e MYSQL_HOST=seu-rds-endpoint \
  -e MYSQL_USER=parking \
  -e MYSQL_PASSWORD=SuaSenha \
  -e MAIL_HOST=smtp.gmail.com \
  -e MAIL_USERNAME=seu@gmail.com \
  -e MAIL_PASSWORD=sua-senha-app \
  -e PAGBANK_EMAIL=seu@gmail.com \
  -e PAGBANK_TOKEN=seu-token \
  easy-parking:latest
```

---

## 🌐 Passo 6: Configurar Domain (Opcional)

### 6.1 Associar Elastic IP
```bash
# No Console AWS:
# 1. EC2 > IPs Elásticos > Alocar endereço
# 2. Associar à sua instância
# 3. Copiar o IP
```

### 6.2 Configurar DNS
```bash
# No seu provedor de DNS (Route 53, GoDaddy, etc):
# Criar registro A apontando para Elastic IP
# seu-dominio.com → seu-ip-elastico
```

### 6.3 Configurar HTTPS (Let's Encrypt)
```bash
# Na instância EC2:

# Instalar Certbot
sudo yum install certbot -y

# Gerar certificado
sudo certbot certonly --standalone -d seu-dominio.com

# Usar em aplicação Spring Boot:
# server.ssl.key-store=...
# server.ssl.key-store-password=...
```

---

## 🔍 Passo 7: Verificar Deploy

### 7.1 Testar Aplicação
```bash
# Obter IP público da instância
# Testar: curl http://seu-ip:8080/

# Ou acessar no navegador:
# http://seu-ip:8080
```

### 7.2 Ver Logs
```bash
# Via SSH na instância:
docker logs <container-id>

# Ou em tempo real:
docker logs -f <container-id>
```

---

## 💾 Passo 8: Backup e Monitoração

### 8.1 RDS Backup
```bash
# No Console AWS:
# RDS > Bancos de dados > easy-parking-mysql
# Backups > Criar snapshot manual
```

### 8.2 CloudWatch Monitoring
```bash
# No Console AWS:
# CloudWatch > Dashboards > Criar novo
# Adicionar métricas de:
# - EC2 CPU
# - RDS conexões
# - RDS espaço disco
```

---

## 📊 Custos AWS Free Tier (12 meses grátis)

- EC2 t3.micro: 750 horas/mês
- RDS db.t3.micro MySQL: 750 horas/mês
- Storage RDS: 20 GB
- Data transfer: 15 GB/mês
- CloudWatch: Free tier

**Custo Estimado Após 12 meses:** ~$15-25/mês

---

## 🆘 Troubleshooting

### Erro: "Connection refused" no banco
```bash
# Verificar security group RDS
# EC2 security group deve permitir acesso na porta 3306 do RDS security group
```

### Erro: "Out of memory"
```bash
# Aumentar Xmx na JVM:
# docker run -e JAVA_OPTS="-Xmx1G" ...
```

### Aplicação não inicia
```bash
# Ver logs
docker logs <container-id>

# Verificar variáveis de ambiente
docker exec <container-id> env
```

---

## 📚 Links Úteis

- AWS Console: https://console.aws.amazon.com/
- AWS Free Tier: https://aws.amazon.com/free/
- RDS Documentation: https://docs.aws.amazon.com/rds/
- EC2 Documentation: https://docs.aws.amazon.com/ec2/

---

**Próximos passos:** Seguir o DEPLOYMENT-CHECKLIST-AWS.md

**Última atualização:** 2026-08-04

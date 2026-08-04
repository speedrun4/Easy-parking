# ✅ Checklist de Deploy Produção - Easy Parking (AWS Free Tier)

## 📋 Pré-Deploy (Antes de Começar)

### Preparação Local
- [ ] Código commitado no Git
- [ ] Testes passando localmente
- [ ] Build Maven bem-sucedido
- [ ] Build Angular bem-sucedido
- [ ] Docker instalado e funcionando
- [ ] AWS CLI instalado

### Configurações Necessárias
- [ ] Arquivo `.env` criado com valores AWS
- [ ] AWS Account criado (Free Tier)
- [ ] Credenciais Gmail/PagBank obtidas
- [ ] Senhas fortes geradas

---

## 🔐 Passo 1: AWS Account Setup (10 min)

### Criar Conta
- [ ] Acessar https://aws.amazon.com/
- [ ] Clicar "Criar conta"
- [ ] Preencher dados pessoais
- [ ] Confirmar email
- [ ] Adicionar cartão de crédito (para verificação, não cobra se usar Free Tier)
- [ ] Escolher plano: **Plano Básico (Free Tier)**

### Verificar Free Tier
- [ ] Acessar https://console.aws.amazon.com/
- [ ] Confirmar "Free Tier" está ativo
- [ ] Salvar AWS Account ID

---

## 🔑 Passo 2: Criar Usuário IAM (5 min)

### No Console AWS
- [ ] IAM > Usuários > Criar usuário
- [ ] Nome: `easy-parking-deploy`
- [ ] Marcar: "Acesso programático"
- [ ] Anexar políticas: `AmazonEC2FullAccess`, `AmazonRDSFullAccess`
- [ ] Baixar CSV com credenciais
- [ ] Guardar Access Key ID e Secret Access Key

---

## 🔧 Passo 3: Instalar AWS CLI (5 min)

### Windows
- [ ] Baixar: https://aws.amazon.com/cli/
- [ ] Executar instalador
- [ ] Reiniciar PowerShell

### Linux/Mac
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

- [ ] AWS CLI instalado

### Configurar Credenciais
```bash
aws configure

# Informar:
# AWS Access Key ID: [do CSV]
# AWS Secret Access Key: [do CSV]
# Default region: us-east-1
# Default output format: json
```

- [ ] `aws configure` executado
- [ ] Teste: `aws s3 ls` (deve funcionar)

---

## 🗄️ Passo 4: Criar Banco de Dados RDS (15 min)

### Criar Instância MySQL
- [ ] Acessar https://console.aws.amazon.com/rds/
- [ ] Clique: RDS > Bancos de dados > Criar banco
- [ ] Motor: **MySQL 8.0**
- [ ] Classe: **db.t3.micro** (Free Tier)
- [ ] Identificador: `easy-parking-mysql`
- [ ] Master username: `parking`
- [ ] Master password: `ParkingAWS123456!` (copiar)
- [ ] Alocação: **20 GB** (Free Tier)
- [ ] Multi-AZ: **Não** (economizar)
- [ ] Clicar: **Criar banco**
- [ ] Aguardar ~5-10 minutos

### Obter Endpoint
- [ ] Banco criado e status "available"
- [ ] Clicar no banco
- [ ] Copiar **Endpoint** (exemplo: `easy-parking-mysql.c123456.us-east-1.rds.amazonaws.com`)
- [ ] Salvar em `.env` como `MYSQL_HOST`

### Criar Banco de Dados
```bash
# Instalar MySQL Client:
# Windows: choco install mysql
# Linux: sudo apt-get install mysql-client
# Mac: brew install mysql-client

# Conectar ao RDS:
mysql -h easy-parking-mysql.c123456.us-east-1.rds.amazonaws.com -u parking -p

# Digitar senha: ParkingAWS123456!

# Criar banco:
CREATE DATABASE easyparking;
EXIT;
```

- [ ] Banco `easyparking` criado
- [ ] Conexão bem-sucedida

---

## 🔐 Passo 5: Configurar Security Group RDS (5 min)

### Permitir Acesso
- [ ] RDS > Banco > Conectividade e segurança
- [ ] Security Group > Clicar no grupo
- [ ] Inbound Rules > Editar
- [ ] Adicionar regra:
  - Type: MySQL/Aurora (3306)
  - Source: 0.0.0.0/0 (temporário para teste)
- [ ] Salvar

- [ ] Security Group configurado

---

## 🖥️ Passo 6: Criar Instância EC2 (10 min)

### Criar Instância
- [ ] Acessar https://console.aws.amazon.com/ec2/
- [ ] EC2 > Instâncias > Executar instância
- [ ] AMI: **Amazon Linux 2** (Free Tier eligible)
- [ ] Tipo: **t3.micro** (Free Tier)
- [ ] Storage: **30 GB** (Free Tier)
- [ ] Clique: **Executar instância**
- [ ] Aguardar iniciar (~2 min)

### Criar Key Pair
- [ ] Antes de executar, criar Key Pair
- [ ] Nome: `easy-parking`
- [ ] Tipo: RSA
- [ ] Baixar arquivo `easy-parking.pem`
- [ ] Guardar em local seguro (ex: `C:\Users\SEU_USER\.ssh\`)

- [ ] Instância criada e rodando
- [ ] Key Pair baixado
- [ ] Anotar Public IP da instância

---

## 🔒 Passo 7: Configurar Security Group EC2 (5 min)

### Adicionar Regras
- [ ] EC2 > Instâncias > Selecionar instância
- [ ] Security groups > Editar inbound rules
- [ ] Adicionar:
  - SSH (porta 22): Sua IP ou 0.0.0.0/0 (temporário)
  - HTTP (porta 80): 0.0.0.0/0
  - HTTPS (porta 443): 0.0.0.0/0
  - TCP (porta 8080): 0.0.0.0/0
- [ ] Salvar

- [ ] Portas configuradas

---

## 🔌 Passo 8: Conectar à Instância EC2 (5 min)

### Windows PowerShell
```bash
# Navegar para pasta com easy-parking.pem
cd C:\Users\SEU_USER\.ssh\

# Dar permissão
icacls easy-parking.pem /inheritance:r /grant:r "$($env:USERNAME):(F)"

# Conectar
ssh -i easy-parking.pem ec2-user@seu-ec2-ip
```

### Linux/Mac
```bash
chmod 400 ~/easy-parking.pem
ssh -i ~/easy-parking.pem ec2-user@seu-ec2-ip
```

- [ ] Conectado via SSH à instância

---

## 📦 Passo 9: Instalar Dependências (10 min)

### Na Instância EC2 (via SSH)

```bash
# Atualizar sistema
sudo yum update -y

# Instalar Docker
sudo yum install docker -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Instalar Java 8
sudo yum install java-1.8.0-openjdk java-1.8.0-openjdk-devel -y

# Instalar Maven
sudo yum install maven -y

# Verificar instalações
docker --version
java -version
mvn -version
```

- [ ] Docker instalado
- [ ] Java 8 instalado
- [ ] Maven instalado

---

## 🚀 Passo 10: Clonar Repositório e Build (20 min)

### Na Instância EC2

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/easy-parking.git
cd easy-parking

# Copiar .env.example → .env
cp .env.example .env

# Editar .env com valores AWS
nano .env

# Pressionar CTRL+X para sair e salvar
```

- [ ] Repositório clonado
- [ ] `.env` com valores corretos

### Build Frontend
```bash
cd front-end
npm install
npm run build
cd ..
```

- [ ] Frontend buildado

### Build Backend
```bash
cd back-end
mvn clean package -DskipTests
cd ..
```

- [ ] Backend compilado

### Build Docker
```bash
docker build -t easy-parking:latest .

# Verificar
docker images | grep easy-parking
```

- [ ] Docker image criada

---

## ☁️ Passo 11: Executar Aplicação (5 min)

### Rodando com Docker

```bash
docker run -d \
  -p 8080:8080 \
  -e MYSQL_HOST=seu-rds-endpoint \
  -e MYSQL_PORT=3306 \
  -e MYSQL_USER=parking \
  -e MYSQL_PASSWORD=ParkingAWS123456! \
  -e MYSQL_DB=easyparking \
  -e MAIL_HOST=smtp.gmail.com \
  -e MAIL_PORT=587 \
  -e MAIL_USERNAME=seu@gmail.com \
  -e MAIL_PASSWORD=sua-senha-app \
  -e PAGBANK_EMAIL=seu@gmail.com \
  -e PAGBANK_TOKEN=seu-token \
  -e SPRING_PROFILES_ACTIVE=prod \
  --name easy-parking \
  easy-parking:latest

# Verificar se rodou
docker ps | grep easy-parking

# Ver logs
docker logs -f easy-parking
```

- [ ] Container rodando
- [ ] Logs sem erros

---

## 🧪 Passo 12: Validação e Testes (10 min)

### Testar Aplicação
```bash
# Obter IP público da instância EC2
# Testar via curl:
curl http://seu-ec2-ip:8080/

# Ou no navegador:
# http://seu-ec2-ip:8080
```

- [ ] Frontend carrega (HTML retornado)
- [ ] Health check OK
- [ ] API respondendo
- [ ] Banco conectado

### Testar Banco
```bash
# Verificar conexão
docker exec easy-parking bash -c "mysql -h MYSQL_HOST -u parking -p'ParkingAWS123456!' easyparking -e 'SHOW TABLES;'"
```

- [ ] Banco conectado
- [ ] Tabelas criadas

---

## 🌐 Passo 13: Configurar Domínio (Opcional - 15 min)

### Associar Elastic IP
- [ ] EC2 > Endereços de IP elásticos > Alocar endereço
- [ ] Associar à instância
- [ ] Copiar o IP estático
- [ ] Guardar para DNS

### Configurar DNS
- [ ] No seu provedor (Route 53, GoDaddy, etc)
- [ ] Criar registro A: `seu-dominio.com` → `seu-elastic-ip`
- [ ] Aguardar propagação DNS (~5-30 min)
- [ ] Testar: `nslookup seu-dominio.com`

- [ ] DNS apontando corretamente

### HTTPS com Let's Encrypt (Opcional)
```bash
# Na instância EC2:
sudo yum install certbot -y
sudo certbot certonly --standalone -d seu-dominio.com

# Configurar no application.properties:
# server.ssl.key-store=/path/to/keystore.p12
# server.ssl.key-store-password=password
```

- [ ] Certificado SSL gerado
- [ ] HTTPS funciona

---

## 📊 Passo 14: Monitoramento (10 min)

### CloudWatch Monitoring
- [ ] Acessar CloudWatch
- [ ] Criar Dashboard
- [ ] Adicionar métricas:
  - EC2 CPU Utilization
  - RDS Database Connections
  - RDS Free Storage Space
- [ ] Configurar alertas para alta CPU (> 80%)

- [ ] Monitoramento ativado

### Ver Logs Aplicação
```bash
# Real-time
docker logs -f easy-parking

# Últimas 50 linhas
docker logs --tail 50 easy-parking

# Com timestamp
docker logs --timestamps easy-parking
```

- [ ] Logs visíveis e sem erros

---

## 💾 Passo 15: Backup (5 min)

### RDS Backup Manual
- [ ] RDS > Bancos de dados > easy-parking-mysql
- [ ] Backups > Criar snapshot manual
- [ ] Descrição: "Pre-production backup"
- [ ] Criar

- [ ] Backup criado

### Testar Restore
- [ ] Snapshots > Restaurar snapshot
- [ ] Verificar se funciona

- [ ] Restore testado

---

## 🔒 Passo 16: Segurança (10 min)

### Variáveis de Ambiente Seguras
- [ ] `.env` com credenciais **NÃO foi commitado**
- [ ] Usar AWS Secrets Manager para secrets:
```bash
aws secretsmanager create-secret \
  --name easy-parking/mysql-password \
  --secret-string ParkingAWS123456!
```

- [ ] Secrets Manager configurado

### Security Group - Restringir Acesso
- [ ] EC2: Apenas sua IP pode acessar SSH
- [ ] RDS: Apenas EC2 security group pode acessar
- [ ] Remover 0.0.0.0/0 se não precisar

- [ ] Security Groups restringidos

---

## 📈 Passo 17: Teste Final de Funcionalidade (30 min)

### Fluxos Críticos Testados
- [ ] Usuário pode fazer login
- [ ] Visualizar estacionamentos
- [ ] Fazer reserva
- [ ] Processar pagamento (PIX/PagBank)
- [ ] Receber email de confirmação
- [ ] Admin consegue acessar painel
- [ ] Notificações funcionam

- [ ] Todos os fluxos testados

---

## 📞 Passo 18: Documentação (10 min)

### Documentar Setup
- [ ] DEPLOYMENT-GUIDE-AWS.md atualizado
- [ ] Credenciais salvas em local seguro
- [ ] Key Pair backup realizado
- [ ] IP e endpoints anotados

### Criar Runbook
- [ ] Como fazer deploy (rebuild Docker)
- [ ] Como ver logs (docker logs)
- [ ] Como fazer rollback (versão anterior)
- [ ] Como restaurar backup (RDS)

- [ ] Documentação completa

---

## 🎯 Passo 19: Pós-Deploy (Ongoing)

### Monitoramento Diário
- [ ] Verificar CloudWatch
- [ ] Verificar CPU/Memória EC2
- [ ] Verificar conexões RDS
- [ ] Verificar logs da aplicação

### Manutenção Mensal
- [ ] Atualizar sistema operacional
- [ ] Rotacionar credenciais
- [ ] Testar backup/restore
- [ ] Revisar logs de segurança

### Planejamento Trimestral
- [ ] Revisão de performance
- [ ] Otimizações identificadas
- [ ] Upgrade de recursos (se necessário)
- [ ] Revisão de custos

---

## ✅ Checklist Final

```
PRONTIDÃO PARA PRODUÇÃO:

☑️ AWS Account criado (Free Tier)
☑️ IAM User e Access Keys geradas
☑️ AWS CLI instalado e configurado
☑️ RDS MySQL criado e operacional
☑️ EC2 instância rodando
☑️ Docker instalado
☑️ Java e Maven instalados
☑️ Repositório clonado
☑️ .env com valores AWS
☑️ Frontend buildado
☑️ Backend compilado
☑️ Docker image criada
☑️ Aplicação rodando (docker ps)
☑️ API respondendo
☑️ Banco conectado
☑️ Logs sem erros críticos
☑️ CloudWatch monitorando
☑️ Backup criado
☑️ Segurança configurada
☑️ Domínio customizado (opcional)
☑️ Testes de funcionalidade passando
☑️ Documentação completa

🚀 PRONTO PARA PRODUÇÃO!
```

---

## 💡 AWS Free Tier - Limites

- **EC2 t3.micro:** 750 horas/mês (pode rodar 24/7)
- **RDS MySQL:** 750 horas/mês
- **Storage:** 30 GB EC2 + 20 GB RDS
- **Data transfer:** 100 GB/mês OUT
- **Período:** 12 meses (depois da inscrição)

**Custo após 12 meses:** ~$15-25/mês

---

## 📚 Links Úteis

- AWS Console: https://console.aws.amazon.com/
- AWS Free Tier: https://aws.amazon.com/free/
- EC2 Documentation: https://docs.aws.amazon.com/ec2/
- RDS Documentation: https://docs.aws.amazon.com/rds/
- IAM Console: https://console.aws.amazon.com/iam/

---

**Data de Deployment:** 2026-08-04
**Versão Inicial:** v1.0
**Ambiente:** AWS Free Tier (us-east-1)
**Status:** ✅ READY TO DEPLOY

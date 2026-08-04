# 🚀 Guia Rápido de Produção - Easy Parking

## 📌 Resumo

Seu projeto Easy Parking agora está configurado para produção no **Google Cloud** com:
- ✅ Backend Java Spring Boot
- ✅ Frontend Angular (servido pelo backend)
- ✅ Banco de dados MySQL gerenciado (Cloud SQL)
- ✅ CI/CD automático (Cloud Build)
- ✅ Docker containerizado
- ✅ Monitoramento e logs

---

## ⚡ Quick Start - Primeiros Passos (15 minutos)

### 1️⃣ Criar Conta Google Cloud
```bash
# Ir em https://cloud.google.com/
# Criar projeto: easy-parking-prod
```

### 2️⃣ Instalar Google Cloud SDK
```bash
# Windows/Linux/Mac
# https://cloud.google.com/sdk/docs/install

# Depois:
gcloud init
gcloud auth login
```

### 3️⃣ Configurar Variáveis de Ambiente
```bash
# Copiar o arquivo de exemplo
cp .env.example .env

# Editar .env com seus valores:
# - IP do Cloud SQL
# - Credenciais de email
# - Token PagBank
# - Etc.
```

### 4️⃣ Deploy em 1 Comando
```bash
# Windows
.\deploy.bat latest

# Linux/Mac
chmod +x deploy.sh
./deploy.sh latest
```

---

## 📚 Arquivos Importantes

| Arquivo | Propósito |
|---------|-----------|
| [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) | Guia completo passo-a-passo |
| [Dockerfile](Dockerfile) | Containerização da aplicação |
| [docker-compose.yml](docker-compose.yml) | Ambiente de desenvolvimento local |
| [application-prod.properties](back-end/src/main/resources/application-prod.properties) | Configuração de produção |
| [deploy.sh / deploy.bat](deploy.sh) | Script de deploy automático |
| [cloudbuild.yaml](cloudbuild.yaml) | CI/CD com Cloud Build |
| [.env.example](.env.example) | Variáveis de ambiente |

---

## 🔧 Pré-requisitos

- [ ] Google Cloud Account (crie em https://cloud.google.com/)
- [ ] Google Cloud SDK instalado
- [ ] Docker instalado
- [ ] Node.js 14+ (para testes locais)
- [ ] Maven 3.6+ (para builds Java)

---

## 📋 Checklist de Configuração

### Fase 1: Google Cloud
- [ ] Criar projeto no GCP
- [ ] Ativar APIs necessárias (Cloud Run, Cloud SQL, etc.)
- [ ] Criar instância MySQL (Cloud SQL)
- [ ] Criar banco de dados e usuário

### Fase 2: Aplicação
- [ ] Copiar `.env.example` → `.env`
- [ ] Preencher variáveis de ambiente
- [ ] Testar build local: `docker-compose up`
- [ ] Testar endpoints da API

### Fase 3: Deploy
- [ ] Fazer login no GCP: `gcloud auth login`
- [ ] Executar deploy: `./deploy.sh v1.0`
- [ ] Verificar URL do Cloud Run
- [ ] Testar aplicação online

### Fase 4: Pós-Deploy
- [ ] Configurar domínio customizado
- [ ] Ativar SSL/TLS
- [ ] Configurar monitoramento
- [ ] Ativar backups automáticos
- [ ] Documentar runbook

---

## 🧪 Testar Localmente Antes de Produção

```bash
# 1. Copiar .env.example para .env (com valores locais)
cp .env.example .env

# 2. Editar .env para usar banco local
# MYSQL_IP=localhost
# (outros valores locais)

# 3. Subir com Docker Compose
docker-compose up -d

# 4. Verificar se tudo está rodando
curl http://localhost:8080/

# 5. Ver logs
docker-compose logs -f easy-parking

# 6. Parar
docker-compose down
```

---

## 🚀 Deploy em Produção

### Opção A: Usando Script (Recomendado)
```bash
# Windows
.\deploy.bat v1.0

# Linux/Mac
./deploy.sh v1.0
```

### Opção B: Manual com gcloud
```bash
# 1. Fazer login
gcloud auth login

# 2. Configurar projeto
gcloud config set project easy-parking-prod

# 3. Build e push
docker build -t gcr.io/easy-parking-prod/easy-parking:v1.0 .
docker push gcr.io/easy-parking-prod/easy-parking:v1.0

# 4. Deploy
gcloud run deploy easy-parking \
  --image gcr.io/easy-parking-prod/easy-parking:v1.0 \
  --platform managed \
  --region us-central1 \
  --memory 1Gi \
  --allow-unauthenticated
```

---

## 🔍 Monitorar Produção

```bash
# Ver logs em tempo real
gcloud run services logs read easy-parking --follow --region us-central1

# Ver último deploy
gcloud run services describe easy-parking --region us-central1

# Verificar métricas
# Google Cloud Console > Cloud Run > easy-parking > Metrics
```

---

## 🆘 Troubleshooting Rápido

### Erro: "Failed to pull image"
```bash
# Verificar se a imagem foi pushada
docker images | grep easy-parking

# Push manual
gcloud auth configure-docker
docker push gcr.io/easy-parking-prod/easy-parking:latest
```

### Erro: "Database connection failed"
```bash
# Verificar variáveis de ambiente
gcloud run services describe easy-parking --region us-central1 | grep MYSQL

# Testar conexão
gcloud sql connect easy-parking-mysql --user=parking
```

### Erro: "Static files not found"
```bash
# Verificar se frontend foi buildado
docker exec easy-parking ls -la /app/public/

# Fazer rebuild
docker build --no-cache -t gcr.io/easy-parking-prod/easy-parking:latest .
```

---

## 📞 Documentação Completa

Para instruções detalhadas, consulte [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)

---

## 🔐 Segurança

⚠️ **IMPORTANTE:**
- ✅ NUNCA commitar `.env` com credenciais reais
- ✅ USAR variáveis de ambiente para secrets
- ✅ ROTAR credenciais periodicamente
- ✅ ATIVAR Cloud Armor para proteção DDoS
- ✅ FAZER backups regularmente

---

## 📊 Estrutura de Ambiente

```
Easy Parking Production
├── Google Cloud Project
│   ├── Cloud Run (Aplicação)
│   ├── Cloud SQL (MySQL)
│   ├── Cloud Build (CI/CD)
│   ├── Container Registry (Imagens)
│   └── Cloud Monitoring (Alertas)
├── GitHub/GitLab (Repositório)
└── Domínio Customizado (DNS)
```

---

## 🎯 Próximos Passos

1. ✅ Seguir [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)
2. ✅ Configurar domínio customizado
3. ✅ Ativar backups automáticos
4. ✅ Configurar alertas e monitoramento
5. ✅ Implementar logging estruturado
6. ✅ Setup de disaster recovery

---

**Desenvolvido com ❤️ para Easy Parking**

Data: 2026-08-04
Última Atualização: 2026-08-04

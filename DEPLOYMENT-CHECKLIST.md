# ✅ Checklist de Deploy Produção - Easy Parking

## 📋 Pré-Deploy (Antes de Começar)

### Preparação Local
- [ ] Código commitado no Git
- [ ] Testes passando localmente
- [ ] Build Maven bem-sucedido
- [ ] Build Angular bem-sucedido
- [ ] Docker instalado e funcionando
- [ ] Google Cloud SDK instalado

### Configurações Necessárias
- [ ] Arquivo `.env` criado (copiar de `.env.example`)
- [ ] Valores do Google Cloud preenchidos
- [ ] Credenciais Gmail/PagBank obtidas
- [ ] Senhas fortes geradas (23+ caracteres)

---

## 🔐 Passo 1: Google Cloud Setup (30 min)

### Criar Conta e Projeto
- [ ] Acessar https://cloud.google.com/
- [ ] Criar conta (com cartão de crédito válido)
- [ ] Criar novo projeto: `easy-parking-prod`
- [ ] Salvar Project ID

### Instalar Google Cloud SDK
```bash
# Windows: https://cloud.google.com/sdk/docs/install-windows
# Linux: curl https://sdk.cloud.google.com | bash
# Mac: brew install google-cloud-sdk

# Depois:
gcloud init
gcloud auth login
gcloud config set project easy-parking-prod
```

- [ ] Google Cloud SDK instalado
- [ ] Login realizado
- [ ] Projeto configurado

### Ativar APIs Necessárias
```bash
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

- [ ] Cloud Run API ativada
- [ ] Cloud SQL API ativada
- [ ] Cloud Build API ativada
- [ ] Container Registry ativado

---

## 🗄️ Passo 2: Banco de Dados MySQL (20 min)

### Criar Instância MySQL
```bash
gcloud sql instances create easy-parking-mysql \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --availability-type=REGIONAL
```

- [ ] Instância MySQL criada (aguardar ~10 min)
- [ ] Status: `RUNNABLE`

### Criar Banco de Dados e Usuário
```bash
gcloud sql databases create easyparking --instance=easy-parking-mysql

gcloud sql users create parking \
  --instance=easy-parking-mysql \
  --password=SuaSenhaForte123!
```

- [ ] Database `easyparking` criado
- [ ] Usuário `parking` criado
- [ ] Senha configurada

### Obter IP da Instância
```bash
gcloud sql instances describe easy-parking-mysql \
  --format='value(ipAddresses[0].ipAddress)'
```

- [ ] IP público obtido
- [ ] IP salvo em `.env` como `MYSQL_IP`

---

## 🐳 Passo 3: Preparar Aplicação (15 min)

### Configurar Variáveis de Ambiente
```bash
# Copiar template
cp .env.example .env

# Editar .env com:
# - MYSQL_IP (copiado acima)
# - MYSQL_PASSWORD (a senha escolhida)
# - MAIL_USERNAME e MAIL_PASSWORD (Gmail)
# - PAGBANK_EMAIL, PAGBANK_TOKEN, etc.
```

- [ ] Arquivo `.env` criado
- [ ] Todas as variáveis preenchidas
- [ ] Senhas são fortes (23+ caracteres)
- [ ] `.env` NÃO foi commitado no Git

### Configurar Docker
```bash
# Fazer login no Google Container Registry
gcloud auth configure-docker
```

- [ ] Docker pode fazer push para GCP

### Build Local para Teste
```bash
# (opcional) Testar localmente com docker-compose
docker-compose up -d

# Verificar se aplicação inicia
# Aguardar ~30 segundos
curl http://localhost:8080/

docker-compose down
```

- [ ] Build local bem-sucedido
- [ ] Aplicação inicia sem erros
- [ ] API responde em http://localhost:8080/

---

## 🚀 Passo 4: Build e Push para Container Registry (10 min)

### Build da Imagem Docker
```bash
docker build -t gcr.io/easy-parking-prod/easy-parking:v1.0 .
```

- [ ] Build concluído sem erros
- [ ] Verificar com: `docker images | grep easy-parking`

### Push para Google Container Registry
```bash
docker push gcr.io/easy-parking-prod/easy-parking:v1.0
```

- [ ] Push concluído
- [ ] Verificar em GCP Console > Container Registry

---

## ☁️ Passo 5: Deploy no Cloud Run (10 min)

### Deploy da Aplicação
```bash
gcloud run deploy easy-parking \
  --image gcr.io/easy-parking-prod/easy-parking:v1.0 \
  --platform managed \
  --region us-central1 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 3600 \
  --max-instances 10 \
  --allow-unauthenticated
```

- [ ] Deploy iniciado
- [ ] Aguardar conclusão (~2 min)
- [ ] Status: `Active`

### Configurar Variáveis de Ambiente
```bash
gcloud run services update easy-parking \
  --update-env-vars=SPRING_PROFILES_ACTIVE=prod,MYSQL_IP=YOUR_IP \
  --region us-central1
```

- [ ] Variáveis configuradas
- [ ] Serviço reiniciado

---

## 🧪 Passo 6: Validação e Testes (15 min)

### Obter URL do Cloud Run
```bash
gcloud run services describe easy-parking \
  --region us-central1 \
  --format='value(status.address.url)'
```

- [ ] URL obtida
- [ ] URL salva (exemplo: `https://easy-parking-xxxxx.run.app`)

### Testar Aplicação
```bash
# Testar health check
curl CLOUD_RUN_URL/api/health

# Testar frontend
curl CLOUD_RUN_URL/

# Testar banco (exemplo)
curl CLOUD_RUN_URL/api/estacionamentos
```

- [ ] Health check retorna 200 OK
- [ ] Frontend carrega (HTML retornado)
- [ ] API endpoints respondendo
- [ ] Banco de dados conectado

### Ver Logs
```bash
gcloud run services logs read easy-parking \
  --region us-central1 \
  --limit 50
```

- [ ] Logs visíveis
- [ ] Sem erros críticos
- [ ] Aplicação iniciou corretamente

---

## 🌐 Passo 7: Configuração de Domínio (Opcional - 20 min)

### Preparar Domínio
- [ ] Domínio comprado/registrado
- [ ] Acesso ao provedor de DNS

### Apontar para Cloud Run
```bash
# No seu provedor de DNS (GoDaddy, Namecheap, etc):
# Criar CNAME apontando para:
# easy-parking-xxxxx.run.app
```

- [ ] CNAME criado
- [ ] DNS propagado (aguardar 5-30 min)
- [ ] Testar: `curl https://seu-dominio.com`

### Configurar SSL (Automático no GCP)
- [ ] Google Cloud fornece SSL automaticamente
- [ ] Aguardar ~5 min para certificado ser gerado
- [ ] Testar com HTTPS

---

## 📊 Passo 8: Monitoramento e Alertas (15 min)

### Configurar Monitoring
- [ ] Acessar Google Cloud Console
- [ ] Cloud Run > easy-parking > Metrics
- [ ] Verificar CPU, Memória, Latência

### Configurar Alertas
```bash
# Via Console: Cloud Run > Alerts > Create Policy
# Alertas para:
# - CPU > 80%
# - Memória > 80%
# - Error rate > 5%
# - Latência > 2s
```

- [ ] Alertas configurados
- [ ] Email de notificação testado

### Verificar Logs
- [ ] Cloud Run > Logs
- [ ] Buscar por erros dos últimos 30 min
- [ ] Nenhum erro crítico

---

## 💾 Passo 9: Backup (5 min)

### Ativar Backup Automático
```bash
# Via Google Cloud Console:
# Cloud SQL > easy-parking-mysql > Backups > Edit Configuration
# - Ativar backup automático
# - Configurar para diariamente às 2h da manhã
```

- [ ] Backup automático ativado
- [ ] Retenção: 35 dias
- [ ] Fazer backup manual antes de updates

### Criar Backup Manual
```bash
gcloud sql backups create \
  --instance=easy-parking-mysql \
  --description="Pre-production backup"
```

- [ ] Backup criado
- [ ] Visível em Cloud SQL Console

---

## 🔒 Passo 10: Segurança (10 min)

### Cloud Armor (Proteção DDoS)
```bash
gcloud compute security-policies create easy-parking-security \
  --description "Easy Parking Security Policy"

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

- [ ] Cloud Armor criado
- [ ] Regras de rate limiting configuradas

### Variáveis de Ambiente Seguras
- [ ] `.env` com credenciais NÃO foi commitado
- [ ] Usar Secret Manager do GCP para chaves sensíveis
- [ ] Rotacionar credenciais mensalmente

### CORS Configurado
```bash
gcloud run services update easy-parking \
  --set-env-vars=CORS_ORIGINS="https://seu-dominio.com" \
  --region us-central1
```

- [ ] CORS configurado para domínio específico
- [ ] Testar requisição de outro domínio (deve falhar)

---

## 📈 Passo 11: Performance (5 min)

### Verificar Métricas
```bash
gcloud run services describe easy-parking --region us-central1 | grep -i "cpu\|memory"
```

- [ ] CPU utilization < 70% em repouso
- [ ] Memória stable
- [ ] Latência P95 < 500ms
- [ ] Latência P99 < 1000ms

### Escalonamento
- [ ] Min instances: 1
- [ ] Max instances: 10
- [ ] Auto-scale baseado em CPU/Memória

---

## 🎯 Passo 12: Teste Final de Funcionalidade (30 min)

### Fluxos Críticos Testados
- [ ] Usuário pode fazer login
- [ ] Visualizar estacionamentos
- [ ] Fazer reserva
- [ ] Processar pagamento (PIX/PagBank)
- [ ] Receber email de confirmação
- [ ] Admin consegue acessar painel
- [ ] Notificações funcionam

### Testes de Carga (Opcional)
```bash
# Usar tool como Apache JMeter ou Locust
# Testar com 100 usuários simultâneos
# Verificar se aplicação escala corretamente
```

- [ ] Aplicação mantém performance sob carga
- [ ] Sem timeout ou erros 500

---

## 📞 Passo 13: Documentação e Handoff (10 min)

### Documentar Setup
- [ ] DEPLOYMENT-GUIDE.md atualizado
- [ ] README-PRODUCAO.md disponível
- [ ] ARCHITECTURE.md com diagrama
- [ ] TROUBLESHOOTING.md com soluções

### Criar Runbook
- [ ] Como fazer deploy (./deploy.sh)
- [ ] Como ver logs (gcloud logs read)
- [ ] Como fazer rollback (versão anterior)
- [ ] Como restaurar backup (disaster recovery)

### Notificar Usuários
- [ ] Email para stakeholders
- [ ] Anuncio que serviço está em produção
- [ ] Fornecer URL da aplicação
- [ ] Instruções de suporte

---

## 🎓 Passo 14: Pós-Deploy (Ongoing)

### Monitoramento Diário
- [ ] Verificar logs
- [ ] Verificar CPU/Memória
- [ ] Verificar taxa de erro
- [ ] Verificar performance

### Manutenção Mensal
- [ ] Rotacionar credenciais
- [ ] Atualizar dependências
- [ ] Testar backup/restore
- [ ] Revisar logs de segurança

### Planejamento Trimestral
- [ ] Revisão de performance
- [ ] Otimizações identificadas
- [ ] Plano de upgrade
- [ ] Revisão de custos

---

## ✅ Checklist Final

```
PRONTIDÃO PARA PRODUÇÃO:

☑️ Código commitado e testado
☑️ Build local bem-sucedido
☑️ Google Cloud configurado
☑️ Banco de dados criado
☑️ Variáveis de ambiente preenchidas
☑️ Docker image buildada e pushlada
☑️ Aplicação deployada no Cloud Run
☑️ Health checks passando
☑️ API respondendo corretamente
☑️ Frontend carregando
☑️ Banco conectado
☑️ Logs sem erros críticos
☑️ Monitoramento ativado
☑️ Backup automático ativado
☑️ Segurança configurada
☑️ Domínio customizado (opcional)
☑️ SSL/TLS ativado
☑️ Testes de funcionalidade passando
☑️ Documentação completa
☑️ Runbook disponível

🚀 PRONTO PARA PRODUÇÃO!
```

---

## 📞 Suporte

- Google Cloud Documentation: https://cloud.google.com/docs
- Cloud Run Troubleshooting: https://cloud.google.com/run/docs/troubleshooting
- Email de Suporte: seu@email.com
- Slack/Discord: [seu canal de suporte]

---

**Data de Deployment:** 2026-08-04
**Versão Inicial:** v1.0
**Ambiente:** Google Cloud Run (us-central1)
**Status:** ✅ ATIVO

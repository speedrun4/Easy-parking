# Arquitetura de Produção - Easy Parking

## Diagrama da Infraestrutura

```
┌─────────────────────────────────────────────────────────────────┐
│                     INTERNET / USUÁRIOS                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Cloud DNS     │ (seu dominio.com)
                    └────────┬────────┘
                             │
                ┌────────────▼──────────────┐
                │   Cloud Armor (DDoS)      │
                └────────────┬───────────────┘
                             │
                    ┌────────▼────────┐
                    │  Cloud CDN      │
                    └────────┬────────┘
                             │
        ┌────────────────────▼──────────────────────┐
        │         Cloud Load Balancer               │
        └────────────────────┬──────────────────────┘
                             │
        ┌────────────────────▼──────────────────────┐
        │                                            │
        │         Cloud Run                         │
        │   (Easy Parking Application)              │
        │   - Spring Boot Backend                   │
        │   - Angular Frontend (static)             │
        │   - Health Checks                         │
        │   - Auto-scaling 1-10 instances           │
        │                                            │
        └────────────┬───────────────────────────────┘
                     │
        ┌────────────▼──────────────────────────┐
        │                                       │
        │   Cloud SQL (MySQL)                   │
        │   - Database: easyparking             │
        │   - User: parking                     │
        │   - Automated Backups                 │
        │   - Daily Snapshots                   │
        │   - Replication (optional)            │
        │                                       │
        └───────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    MONITORING & LOGGING                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Cloud Logging│  │ Cloud Monitor│  │   Alerting   │           │
│  │  (Logs)      │  │  (Metrics)   │  │ (Notificações)           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   CI/CD PIPELINE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GitHub/GitLab → Cloud Build → Container Registry → Cloud Run   │
│      ↑              ↓               ↓                  ↓         │
│   Push Code    Build Image      Store Image        Deploy       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Requisição do Usuário

```
1. Usuário acessa: https://easy-parking.com
                    ↓
2. DNS resolve para Cloud Load Balancer
                    ↓
3. Cloud Armor verifica (DDoS protection)
                    ↓
4. Cloud CDN cache (se houver hit)
                    ↓
5. Load Balancer roteia para Cloud Run instance
                    ↓
6. Aplicação Spring Boot recebe requisição
                    ↓
7. Se for API: busca dados no Cloud SQL
                    ↓
8. Se for Frontend: retorna HTML/JS do /public
                    ↓
9. Resposta retorna ao usuário
                    ↓
10. Logs enviados para Cloud Logging
```

---

## Componentes de Segurança

```
┌─ NETWORK SECURITY
│  ├─ Cloud Armor (DDoS / WAF)
│  ├─ VPC Connector (Cloud Run → Cloud SQL)
│  ├─ Firewall Rules
│  └─ Private IP para Cloud SQL
│
├─ APPLICATION SECURITY
│  ├─ HTTPS/SSL-TLS (automático)
│  ├─ CORS Configuration
│  ├─ Spring Security
│  └─ Input Validation
│
├─ DATA SECURITY
│  ├─ MySQL com senha forte
│  ├─ Encrypted backups
│  ├─ Automated daily snapshots
│  └─ Point-in-time recovery
│
└─ SECRETS MANAGEMENT
   ├─ Google Secret Manager
   ├─ Environment Variables
   ├─ .env nunca commitado
   └─ Credenciais rotacionadas
```

---

## Escalabilidade

### Cloud Run Auto-scaling
```
CPU: 1 core
Memória: 1 Gi
Instâncias Min: 1
Instâncias Max: 10

Escala automaticamente baseado em:
- CPU (80% threshold)
- Memória (80% threshold)
- Requisições por segundo (100 req/s por instância)
- Tempo de resposta (1 segundo timeout padrão)
```

### Cloud SQL Scaling
```
Máquina: db-f1-micro (pode escalar)
Storage: Auto-expand até 100 GB
Replicação: Disponível

Upgrade automático de:
- MySQL minor versions
- Segurança patches
```

---

## Disaster Recovery

### RPO (Recovery Point Objective): 24 horas
```
Backup automático diário do Cloud SQL
```

### RTO (Recovery Time Objective): < 30 minutos
```
- Cloud Run: Redeployment automático
- Cloud SQL: Restore do backup em ~10 min
```

### Backup Strategy
```
Diário:
  └─ Automático às 2h da manhã
    └─ Retenção: 35 dias

Manual (antes de updates):
  └─ Executar antes de grandes mudanças

Point-in-time recovery:
  └─ Disponível nos últimos 7 dias
```

---

## Monitoramento e Alertas

### Métricas Importantes
```
✓ CPU Utilization
✓ Memory Utilization
✓ Request Latency
✓ Error Rate
✓ Database Connection Pool
✓ MySQL Query Performance
✓ Disk Space (Database)
```

### Alertas Configurados
```
⚠️ CPU > 80% por 5 min
⚠️ Memória > 80% por 5 min
⚠️ Error Rate > 5%
⚠️ Latência > 2 segundos
⚠️ Database Connection fails
⚠️ Disk Space > 80%
⚠️ Backup falha
```

---

## Performance Esperado

```
Latência P95: < 500ms
Latência P99: < 1000ms
Throughput: 1000+ req/s (com 10 instâncias)
Uptime: 99.5% SLA do Cloud Run
Disponibilidade DB: 99.5% (Regional)
```

---

## Custos Estimados (Google Cloud)

```
Cloud Run: ~$15-30/mês (com free tier)
Cloud SQL (db-f1-micro): ~$15-20/mês
Cloud Storage (backups): ~$5-10/mês
Cloud CDN: ~$0.085 por GB (conforme uso)
Cloud Armor: ~$5/mês (regras básicas)

TOTAL ESTIMADO: $40-65/mês
```

---

## Fluxo de Deploy

```
┌─────────┐
│ Git Push│
└────┬────┘
     │
     ▼
┌──────────────┐
│ Cloud Build  │ ← Cloud Build Trigger
│   Webhook    │   (automático)
└────┬─────────┘
     │
     ├─ 1. Checkout código
     │
     ├─ 2. Build Frontend
     │    ├─ npm install
     │    └─ npm run build
     │
     ├─ 3. Build Backend
     │    ├─ mvn clean
     │    └─ mvn package
     │
     ├─ 4. Build Docker Image
     │    └─ docker build
     │
     ├─ 5. Push to Registry
     │    └─ docker push
     │
     └─▶ 6. Deploy Cloud Run
          ├─ Update service
          ├─ Gradual rollout
          ├─ Health checks
          └─ Route traffic
```

---

## Ambiente de Variáveis

```
├─ DATABASE
│  ├─ MYSQL_IP
│  ├─ MYSQL_USER
│  ├─ MYSQL_PASSWORD
│  └─ MYSQL_DB
│
├─ EMAIL (SMTP)
│  ├─ MAIL_HOST
│  ├─ MAIL_PORT
│  ├─ MAIL_USERNAME
│  └─ MAIL_PASSWORD
│
├─ PAGBANK/PAYSEGURO
│  ├─ PAGBANK_EMAIL
│  ├─ PAGBANK_TOKEN
│  ├─ PAGBANK_CLIENT_ID
│  ├─ PAGBANK_CLIENT_SECRET
│  ├─ PAGBANK_NOTIFICATION_URL
│  └─ PIX_KEY
│
├─ APPLICATION
│  ├─ SPRING_PROFILES_ACTIVE=prod
│  ├─ CORS_ORIGINS
│  └─ JAVA_OPTS
│
└─ GOOGLE CLOUD
   ├─ GCP_PROJECT_ID
   ├─ GCP_REGION
   ├─ CLOUD_RUN_SERVICE_NAME
   └─ CLOUD_BUILD_PROJECT_ID
```

---

## Integração com Serviços Externos

```
Easy Parking
├─ Gmail (SMTP)
│  └─ Envio de emails
│
├─ PagBank (API)
│  ├─ Processamento de pagamentos
│  ├─ Webhooks de notificação
│  └─ Consulta de transações
│
├─ Google Maps API
│  └─ Localização de estacionamentos
│
└─ Leaflet (Maps)
   └─ Exibição de mapa no frontend
```

---

**Última atualização:** 2026-08-04

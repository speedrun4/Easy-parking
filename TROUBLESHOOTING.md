# Troubleshooting - Guia de Resolução de Problemas

## 🔴 Problemas Comuns e Soluções

---

## 1. Build & Docker

### ❌ Erro: "Docker command not found"
```bash
# Solução: Instalar Docker
# Windows: https://docs.docker.com/desktop/install/windows-install/
# Linux: curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
# Mac: https://docs.docker.com/desktop/install/mac-install/

# Verificar instalação
docker --version
```

### ❌ Erro: "npm command not found" durante build Docker
```bash
# Solução: Node.js não está instalado no ambiente
# Verificar a imagem base do Dockerfile está correta:

# Errado:
FROM node:alpine

# Correto:
FROM node:14-alpine  ✓
```

### ❌ Erro: "mvn command not found"
```bash
# Solução: Maven não está no PATH
# Verificar instalação: mvn -version

# Se não estiver instalado:
# Windows: Usar Maven plugin do IntelliJ ou instalar em C:\maven
# Linux: sudo apt-get install maven
# Mac: brew install maven
```

### ❌ Erro: "The docker build requires admin/sudo"
```bash
# Linux: Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Depois reiniciar terminal
```

---

## 2. Google Cloud

### ❌ Erro: "gcloud command not found"
```bash
# Solução: Google Cloud SDK não instalado
# https://cloud.google.com/sdk/docs/install

# Após instalar:
gcloud init
gcloud auth login
```

### ❌ Erro: "Project not found"
```bash
# Verificar projeto atual
gcloud config get-value project

# Listar projetos
gcloud projects list

# Configurar novo projeto
gcloud config set project easy-parking-prod
```

### ❌ Erro: "Permission denied" ao executar gcloud
```bash
# Solução: Re-autenticar
gcloud auth login

# Ou usar service account:
gcloud auth activate-service-account --key-file=key.json

# Verificar credenciais
gcloud config list
```

### ❌ Erro: "Cloud Run API not enabled"
```bash
# Solução: Ativar API
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

---

## 3. Database (MySQL)

### ❌ Erro: "Can't connect to MySQL server"
```bash
# Verificar status da instância
gcloud sql instances describe easy-parking-mysql

# Verificar IP público
gcloud sql instances describe easy-parking-mysql --format='value(ipAddresses[0].ipAddress)'

# Se não tiver IP, criar:
gcloud sql instances patch easy-parking-mysql --assign-ip

# Testar conexão
gcloud sql connect easy-parking-mysql --user=parking

# Se falhar, verificar VPC Connector:
gcloud compute networks vpc-access connectors list --region us-central1
```

### ❌ Erro: "Access denied for user 'parking'@'..'"
```bash
# Resetar senha
gcloud sql users set-password parking \
  --instance=easy-parking-mysql \
  --password=SuaSenhaForte123!

# Recrear usuário
gcloud sql users delete parking --instance=easy-parking-mysql
gcloud sql users create parking \
  --instance=easy-parking-mysql \
  --password=SuaSenhaForte123!
```

### ❌ Erro: "Database 'easyparking' does not exist"
```bash
# Criar banco de dados
gcloud sql databases create easyparking --instance=easy-parking-mysql

# Verificar bancos existentes
gcloud sql databases list --instance=easy-parking-mysql
```

### ❌ Erro: "Public IP not authorized"
```bash
# Adicionar seu IP às exceções
gcloud sql instances patch easy-parking-mysql \
  --add-management-flags "authorized-networks=$(curl -s http://icanhazip.com)/32"

# Verificar redes autorizadas
gcloud sql instances describe easy-parking-mysql | grep -A5 "ipConfiguration"
```

### ❌ Banco lento / Timeout nas queries
```bash
# Aumentar timeout da conexão
# No application-prod.properties:
spring.datasource.hikari.connection-timeout=60000

# Aumentar pool de conexões
spring.datasource.hikari.maximum-pool-size=20

# Reiniciar aplicação
gcloud run deploy easy-parking --image gcr.io/easy-parking-prod/easy-parking:latest
```

---

## 4. Cloud Run

### ❌ Erro: "Container failed to start"
```bash
# Ver logs detalhados
gcloud run services logs read easy-parking --region us-central1 --limit 100

# Buscar erro
gcloud run services logs read easy-parking \
  --region us-central1 \
  --filter='severity>=ERROR' \
  --limit 50
```

### ❌ Erro: "Failed to pull image"
```bash
# Verificar se a imagem existe no Container Registry
gcloud container images list | grep easy-parking

# Verificar autenticação Docker
gcloud auth configure-docker

# Push da imagem novamente
docker push gcr.io/easy-parking-prod/easy-parking:latest

# Deploy novamente
gcloud run deploy easy-parking \
  --image gcr.io/easy-parking-prod/easy-parking:latest
```

### ❌ Erro: "Health check failed"
```bash
# Verificar health endpoint
curl https://CLOUD_RUN_URL/api/health

# Verificar logs
gcloud run services logs read easy-parking \
  --filter='resource.type="cloud_run_revision"' \
  --limit 50

# Adicionar delay maior no health check
# No Cloud Run console ou:
gcloud beta run services update easy-parking \
  --startup-probe-initial-delay 60
```

### ❌ Erro: "Timeout - request took > 3600s"
```bash
# Aumentar timeout
gcloud run services update easy-parking \
  --timeout 3600 \
  --region us-central1

# Ou até 1 hora (máximo):
gcloud run services update easy-parking \
  --timeout 3600 \
  --region us-central1
```

### ❌ Erro: "Out of memory"
```bash
# Aumentar memória da instância
gcloud run services update easy-parking \
  --memory 2Gi \
  --region us-central1

# Ou escalar mais:
gcloud run services update easy-parking \
  --memory 4Gi \
  --max-instances 5 \
  --region us-central1

# Verificar heap da JVM
# No application-prod.properties:
# JAVA_OPTS=-Xmx1G -Xms512m
```

### ❌ Erro: "Service not accessible"
```bash
# Verificar se está público
gcloud run services describe easy-parking --region us-central1 | grep -i "Ingress\|public"

# Tornar público
gcloud run services update easy-parking \
  --allow-unauthenticated \
  --region us-central1

# Verificar URL
gcloud run services describe easy-parking \
  --region us-central1 \
  --format='value(status.address.url)'
```

---

## 5. Variáveis de Ambiente

### ❌ Erro: "Environment variable not found"
```bash
# Verificar variáveis configuradas
gcloud run services describe easy-parking --region us-central1 | grep -A20 "env"

# Adicionar nova variável
gcloud run services update easy-parking \
  --update-env-vars KEY=VALUE \
  --region us-central1

# Remover variável
gcloud run services update easy-parking \
  --remove-env-vars KEY \
  --region us-central1

# Ver todas as variáveis
gcloud run services describe easy-parking \
  --region us-central1 \
  --format='value(spec.template.spec.containers[0].env[*].name)'
```

### ❌ Valores vazios nas variáveis
```bash
# Verificar se variáveis têm valores corretos
gcloud run services update easy-parking \
  --set-env-vars MAIL_HOST=smtp.gmail.com \
  --set-env-vars MAIL_USERNAME=seu@gmail.com \
  --set-env-vars MAIL_PASSWORD="senha-app" \
  --region us-central1
```

---

## 6. Frontend (Angular)

### ❌ Erro: "404 Not Found" para arquivos estáticos
```bash
# Verificar se frontend foi buildado
docker exec easy-parking ls -la /app/public/

# Se vazio, rebuild do Docker:
docker build --no-cache -t gcr.io/easy-parking-prod/easy-parking:latest .
docker push gcr.io/easy-parking-prod/easy-parking:latest

# Verificar paths no Dockerfile
# COPY --from=frontend-builder /app/frontend/dist/easy-parking/ /app/public/

# Se o build copiou para pasta errada, ajustar:
# dist/easy-parking contém os arquivos
```

### ❌ Erro: "Angular app loading infinite spinner"
```bash
# Verificar console do navegador (F12)
# Procurar por erros de CORS ou API

# Verificar CORS está configurado
gcloud run services describe easy-parking --region us-central1 | grep CORS

# Se não tiver, adicionar:
gcloud run services update easy-parking \
  --set-env-vars CORS_ORIGINS="https://seu-dominio.com" \
  --region us-central1

# Verificar no application-prod.properties
spring.web.cors.allowed-origins=${CORS_ORIGINS:...}
```

### ❌ Erro: "api/health endpoint not found"
```bash
# Verificar se o backend está servindo
curl https://CLOUD_RUN_URL/api/

# Se 404, verificar se o controller existe
grep -r "@GetMapping(\"/health\")" back-end/src/

# Se não existir, criar:
# Adicionar em algum controller:
@GetMapping("/api/health")
public ResponseEntity<?> health() {
    return ResponseEntity.ok("{\"status\":\"UP\"}");
}
```

---

## 7. Performance & Logs

### ❌ Erro: "Application very slow"
```bash
# Verificar métrica de CPU
gcloud monitoring time-series list \
  --filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count"'

# Ver se há muitas requisições
gcloud run services logs read easy-parking \
  --region us-central1 \
  --limit 100 | grep -i "ERROR\|WARN"

# Se CPU alta, aumentar:
gcloud run services update easy-parking \
  --cpu 2 \
  --region us-central1
```

### ❌ Erro: "Out of disk space"
```bash
# Verificar Cloud SQL disk
gcloud sql instances describe easy-parking-mysql | grep -A5 "currentDiskSize\|settings"

# Aumentar automaticamente:
gcloud sql instances patch easy-parking-mysql \
  --database-flags cloudsql_iam_authentication=on

# Ou reduzir retenção de logs/backups
```

---

## 8. Segurança

### ❌ Erro: "SSL certificate error"
```bash
# Google Cloud fornece SSL automaticamente
# Se ainda com erro, esperar ~5 minutos para propagação

# Verificar certificado
gcloud run services describe easy-parking --format='value(status.address.url)' | xargs curl -vI
```

### ❌ Erro: "Unauthorized to access resource"
```bash
# Verificar permissões IAM
gcloud projects get-iam-policy easy-parking-prod | grep -i "roles/run"

# Adicionar role:
gcloud projects add-iam-policy-binding easy-parking-prod \
  --member=user:seu@email.com \
  --role=roles/run.admin
```

---

## 9. Backup & Disaster Recovery

### ❌ Erro: "Backup failed"
```bash
# Verificar status dos backups
gcloud sql backups list --instance=easy-parking-mysql

# Fazer backup manual
gcloud sql backups create \
  --instance=easy-parking-mysql \
  --description="Manual backup"

# Verificar logs
gcloud logging read "resource.type=cloudsql_database" --limit 50
```

### ❌ Precisar restaurar de backup
```bash
# Listar backups
gcloud sql backups list --instance=easy-parking-mysql

# Restaurar (atenção: destrutivo!)
gcloud sql backups restore BACKUP_ID \
  --backup-instance=easy-parking-mysql

# Ponto-no-tempo recovery (últimos 7 dias)
gcloud sql backups create \
  --instance=easy-parking-mysql \
  --backup-configuration=automatic \
  --restore-instance=easy-parking-mysql \
  --backup-configuration=automatic \
  --point-in-time='2024-08-03T14:30:00Z'
```

---

## 10. CI/CD (Cloud Build)

### ❌ Erro: "Cloud Build failed"
```bash
# Ver builds
gcloud builds list --limit 10

# Ver logs do último build
gcloud builds log $(gcloud builds list --limit=1 --format='value(id)')

# Retentar build
gcloud builds submit --config cloudbuild.yaml
```

### ❌ Erro: "Git webhook not triggered"
```bash
# Verificar trigger
gcloud builds triggers list

# Recrear trigger manualmente
# Google Cloud Console > Cloud Build > Triggers > Create Trigger

# Testar push
git push origin main  # Deve ativar o trigger automaticamente
```

---

## 📞 Checklist de Debugging

- [ ] Verificar logs: `gcloud run services logs read easy-parking --limit 100`
- [ ] Verificar variáveis: `gcloud run services describe easy-parking`
- [ ] Testar conectividade: `curl https://CLOUD_RUN_URL`
- [ ] Testar banco: `gcloud sql connect easy-parking-mysql --user=parking`
- [ ] Verificar Docker: `docker ps` e `docker logs`
- [ ] Verificar Google Cloud SDK: `gcloud --version`
- [ ] Verificar projeto ativo: `gcloud config list`

---

## 🆘 Quando nada funciona

### Opção 1: Restart do serviço
```bash
gcloud run deploy easy-parking \
  --image gcr.io/easy-parking-prod/easy-parking:latest \
  --force \
  --region us-central1
```

### Opção 2: Revert para versão anterior
```bash
# Ver revisions
gcloud run revisions list --service easy-parking --region us-central1

# Ativar revisão anterior
gcloud run services update-traffic easy-parking \
  --to-revisions=REVISION_ID=100 \
  --region us-central1
```

### Opção 3: Deletar e recriar
```bash
# ⚠️ CUIDADO: Irá remover o serviço mas NÃO o banco de dados

# Deletar
gcloud run services delete easy-parking --region us-central1

# Recriar
gcloud run deploy easy-parking \
  --image gcr.io/easy-parking-prod/easy-parking:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 📚 Recursos Úteis

- Google Cloud Docs: https://cloud.google.com/docs
- Cloud Run Troubleshooting: https://cloud.google.com/run/docs/troubleshooting
- Spring Boot Docs: https://spring.io/projects/spring-boot
- Angular Docs: https://angular.io/docs
- MySQL Docs: https://dev.mysql.com/doc/

---

**Última atualização:** 2026-08-04

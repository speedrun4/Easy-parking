# 🚀 Quick Start AWS - Easy Parking em Produção (30 minutos)

## 📌 Resumo Executivo

Você vai subir sua aplicação em produção usando **AWS Free Tier** (grátis por 12 meses):
- ✅ EC2 (servidor virtual)
- ✅ RDS MySQL (banco de dados)
- ✅ Grátis para os próximos 12 meses
- ✅ Sem cartão de crédito necessário (apenas para verificação)

---

## ⚡ 5 Passos Principais

### 1️⃣ Criar Conta AWS (5 min)
```
https://aws.amazon.com/
→ Criar conta gratuita
→ Escolher "Free Tier"
```

### 2️⃣ Instalar AWS CLI (5 min)
```bash
# Windows: https://aws.amazon.com/cli/
# ou via PowerShell:
choco install awscli

# Linux/Mac:
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install
```

### 3️⃣ Criar Banco de Dados (10 min)
```bash
# No console AWS:
# RDS → Criar banco
# - Motor: MySQL 8.0
# - Classe: db.t3.micro
# - Identificador: easy-parking-mysql
# - Senha: ParkingAWS123456!
```

### 4️⃣ Criar Servidor Virtual (10 min)
```bash
# No console AWS:
# EC2 → Instâncias
# - AMI: Amazon Linux 2
# - Tipo: t3.micro
# - Key Pair: easy-parking
```

### 5️⃣ Fazer Deploy (5 min)
```bash
# Na instância EC2:
git clone https://seu-repo.git
cd easy-parking
docker build -t easy-parking .
docker run -d -p 8080:8080 easy-parking
```

---

## 📋 Arquivos Importantes

| Arquivo | Propósito |
|---------|-----------|
| [DEPLOYMENT-GUIDE-AWS.md](DEPLOYMENT-GUIDE-AWS.md) | Guia completo passo-a-passo |
| [DEPLOYMENT-CHECKLIST-AWS.md](DEPLOYMENT-CHECKLIST-AWS.md) | Checklist com 19 fases |
| [Dockerfile](Dockerfile) | Containerização da aplicação |
| [docker-compose.yml](docker-compose.yml) | Ambiente de desenvolvimento local |
| [application-prod.properties](back-end/src/main/resources/application-prod.properties) | Configuração de produção |
| [.env.example](.env.example) | Variáveis de ambiente |

---

## 🎯 Próximos Passos

### Opção 1: Quick Start (Rápido)
Siga o [DEPLOYMENT-GUIDE-AWS.md](DEPLOYMENT-GUIDE-AWS.md) - 30 minutos de setup

### Opção 2: Passo-a-Passo Completo
Use o [DEPLOYMENT-CHECKLIST-AWS.md](DEPLOYMENT-CHECKLIST-AWS.md) - mais detalhado

---

## 💰 Custos

**Primeiros 12 meses:** 🆓 **GRÁTIS**
- EC2 t3.micro: 750 horas/mês
- RDS MySQL: 750 horas/mês
- 30 GB storage
- Suporta aplicação rodando 24/7

**Após 12 meses:** ~$15-25/mês

---

## 🆘 Precisa de Ajuda?

- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Problemas e soluções
- [ARCHITECTURE.md](ARCHITECTURE.md) - Diagrama de infraestrutura
- AWS Docs: https://docs.aws.amazon.com/

---

**Última atualização:** 2026-08-04

# Deployment Guide - Oracle Always Free (Easy Parking)

This guide deploys Easy Parking on Oracle Cloud Always Free using one VM and Docker Compose.

## 1. Create Oracle Free VM

1. Create an Oracle Cloud account (Always Free).
2. Create a Compute instance:
- Shape: VM.Standard.E2.1.Micro (Always Free)
- OS: Ubuntu 22.04
- Public IPv4: enabled
- SSH key: upload your public key
3. Save the Public IP.

## 2. Open Network Ports

In OCI Console:
1. Networking > Virtual Cloud Networks > your subnet > Security Lists
2. Add ingress rules:
- TCP 22 (SSH)
- TCP 80 (optional, for reverse proxy)
- TCP 443 (optional, for HTTPS reverse proxy)
- TCP 8080 (API)

## 3. Connect via SSH

From Windows PowerShell:

```powershell
ssh -i C:\path\to\oracle_key ubuntu@YOUR_ORACLE_PUBLIC_IP
```

## 4. Install Docker and Compose on VM

Run on VM:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
newgrp docker
```

## 5. Upload or Clone Project

Option A (recommended): clone from GitHub:

```bash
git clone https://github.com/YOUR_USER/YOUR_REPO.git
cd Easy-parking
```

Option B: copy local folder using scp:

```powershell
scp -i C:\path\to\oracle_key -r "C:\Users\francisj\projeto pessoal\Easy-parking" ubuntu@YOUR_ORACLE_PUBLIC_IP:~/
```

Then on VM:

```bash
cd ~/Easy-parking
```

## 6. Configure Production Environment

Create .env from template:

```bash
cp .env.example .env
nano .env
```

Set at least these values:

- MYSQL_IP=mysql
- MYSQL_PORT=3306
- MYSQL_DB=easyparking
- MYSQL_USER=parking
- MYSQL_PASSWORD=CHANGE_STRONG_PASSWORD
- MAIL_HOST=smtp.gmail.com
- MAIL_PORT=587
- MAIL_USERNAME=YOUR_EMAIL
- MAIL_PASSWORD=YOUR_GMAIL_APP_PASSWORD
- PAGBANK_EMAIL=YOUR_PAGBANK_EMAIL
- PAGBANK_TOKEN=YOUR_PAGBANK_TOKEN
- PAGBANK_CLIENT_ID=YOUR_PAGBANK_CLIENT_ID
- PAGBANK_CLIENT_SECRET=YOUR_PAGBANK_CLIENT_SECRET
- PAGBANK_NOTIFICATION_URL=http://YOUR_ORACLE_PUBLIC_IP:8080/api/pagbank/notifications
- PIX_KEY=YOUR_PIX_KEY
- CORS_ORIGINS=http://YOUR_ORACLE_PUBLIC_IP:8080,capacitor://localhost,ionic://localhost,http://localhost

## 7. Deploy with Docker Compose

From project root on VM:

```bash
docker compose down
docker compose up -d --build
```

Check status:

```bash
docker compose ps
docker compose logs -f easy-parking
```

## 8. Validate API

On VM:

```bash
curl http://localhost:8080/api/health
```

From your PC:

```powershell
curl http://YOUR_ORACLE_PUBLIC_IP:8080/api/health
```

Expected response:

```json
{"status":"ok"}
```

## 9. Point Android App to Production URL

Update production API URL in [front-end/src/environments/environment.prod.ts](front-end/src/environments/environment.prod.ts):

- apiBaseUrl: 'http://YOUR_ORACLE_PUBLIC_IP:8080'

Then build APK again:

```powershell
.\build-android-apk.ps1
```

## 10. Useful Operations

Restart app:

```bash
docker compose restart easy-parking
```

Restart database:

```bash
docker compose restart mysql
```

Update app after code changes:

```bash
git pull
docker compose up -d --build
```

## Notes

- This path is free tier friendly, but resources are limited.
- For stronger security and HTTPS, add a reverse proxy (Caddy/Nginx) later.
- Keep .env private and never commit it.

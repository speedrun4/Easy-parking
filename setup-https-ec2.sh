#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   sudo ./setup-https-ec2.sh api.seu-dominio.com seu-email@dominio.com
# Requires:
#   - DNS A record of DOMAIN pointing to this EC2 public IP
#   - Ports 80 and 443 open in Security Group
#   - App running locally on 127.0.0.1:8080

DOMAIN="${1:-}"
LETSENCRYPT_EMAIL="${2:-}"

if [[ -z "$DOMAIN" || -z "$LETSENCRYPT_EMAIL" ]]; then
  echo "Usage: sudo ./setup-https-ec2.sh <domain> <email>"
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  if command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y nginx
  else
    sudo yum install -y nginx
  fi
fi

if ! command -v certbot >/dev/null 2>&1; then
  if command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y certbot python3-certbot-nginx
  else
    sudo amazon-linux-extras enable epel >/dev/null 2>&1 || true
    sudo yum clean metadata
    sudo yum install -y certbot python3-certbot-nginx
  fi
fi

sudo mkdir -p /etc/nginx/conf.d
sudo tee /etc/nginx/conf.d/easy-parking.conf >/dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$LETSENCRYPT_EMAIL" --redirect

sudo nginx -t
sudo systemctl reload nginx

echo "HTTPS configured successfully for https://$DOMAIN"

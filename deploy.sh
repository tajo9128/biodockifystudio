#!/bin/bash
set -e

echo "=== BioDockify Studio Deploy ==="

# 1. Build locally
echo "[1/4] Building production bundle..."
npm run build

# 2. Create remote directory
echo "[2/4] Uploading to VPS..."
ssh root@YOUR_VPS_IP "mkdir -p /var/www/biodockifystudio"

# 3. Upload dist folder
rsync -avz --delete dist/ root@YOUR_VPS_IP:/var/www/biodockifystudio/dist/

# 4. Upload nginx config and enable
echo "[3/4] Configuring nginx..."
scp nginx-biodockifystudio.conf root@YOUR_VPS_IP:/etc/nginx/sites-available/biodockifystudio
ssh root@YOUR_VPS_IP "
    ln -sf /etc/nginx/sites-available/biodockifystudio /etc/nginx/sites-enabled/biodockifystudio
    nginx -t && systemctl reload nginx
"

echo "[4/4] Done!"
echo "Visit: http://biodockifystudio.biodockify.com"
echo ""
echo "To enable HTTPS, run on your VPS:"
echo "  certbot --nginx -d biodockifystudio.biodockify.com"

#!/bin/bash
# ==============================================================================
# BİLİŞİM ARENASI - ORACLE CLOUD ALWAYS FREE OTOMATİK KURULUM BETİĞİ
# ==============================================================================
set -e

echo "=========================================================="
echo "🚀 Bilişim Arenası Oracle Cloud Kurulumu Başlatılıyor..."
echo "=========================================================="

# 1. Paketleri Güncelle
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw iptables-persistent

# 2. Node.js 20 LTS Kurulumu
if ! command -v node &> /dev/null; then
    echo "📦 Node.js 20 LTS kuruluyor..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo "Node.js Sürümü: $(node -v)"
echo "NPM Sürümü: $(npm -v)"

# 3. PM2 Process Manager Kurulumu
if ! command -v pm2 &> /dev/null; then
    echo "⚙️ PM2 Kuruluyor..."
    sudo npm install -g pm2
fi

# 4. Güvenlik Duvarı (Port 80, 443, 3000) Ayarları
echo "🛡️ Güvenlik duvarında portlar açılıyor (80, 443, 3000)..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT 2>/dev/null || sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || true

# Port 80'i Node.js'in root yetkisi olmadan da dinleyebilmesi için yetki ver
sudo setcap 'cap_net_bind_service=+ep' $(which node) || true

# 5. Projeyi Klonla veya Güncelle
cd $HOME
if [ ! -d "bilisim-arenasi" ]; then
    echo "📥 GitHub deposu klonlanıyor..."
    git clone https://github.com/eren61837/bilisim-arenasi.git
fi

cd $HOME/bilisim-arenasi
git pull origin main
npm install --production

# 6. PM2 ile 7/24 Kesintisiz Başlat
echo "🔥 Oyun sunucusu PM2 ile başlatılıyor..."
pm2 stop bilisim-arenasi 2>/dev/null || true
pm2 delete bilisim-arenasi 2>/dev/null || true
pm2 start server.js --name "bilisim-arenasi"
pm2 save

# Sunucu yeniden başlasa bile PM2 otomatik açılsın
STARTUP_CMD=$(pm2 startup systemd -u ubuntu --hp /home/ubuntu | grep 'sudo env')
if [ -n "$STARTUP_CMD" ]; then
    eval "$STARTUP_CMD"
fi

PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "SUNUCU_IP_ADRESIN")

echo "=========================================================="
echo "🎉 TEBRİKLER! Bilişim Arenası 7/24 Kesintisiz Yayında!"
echo "🌐 Doğrudan Erişim: http://${PUBLIC_IP}"
echo "🎮 Portlu Erişim:    http://${PUBLIC_IP}:3000"
echo "=========================================================="

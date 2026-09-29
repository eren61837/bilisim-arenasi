---
title: Bilisim Arenasi
emoji: 🎮
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
---

# 🎮 Bilişim Arenası (Arcade Game Hub)

Modern, optimize edilmiş, MEB filtrelerine takılmayan çok oyunculu web oyun platformu.

## 🕹️ Dahil Olan Oyunlar & Modlar
- **🔴 Redmatch 3D Arena FPS:** Three.js motorlu 3D arena nişancı oyunu. Grapple kancası, 5 adet özel 3D silah (Piyade Tüfeği, Pompalı, Keskin Nişancı, Çifte, Taktik Bıçak), dinamik namlu alev ışığı, zıplama rampaları, akıllı bot yapay zekası, geliştirme kabinleri (Can, Hız, Zıplama).
- **🔫 CS 1.6 Dust2 3D:** de_dust2 haritası, AK-47, M4A1, AWP, Deagle, dinamik namlu ışıkları, kan ve vuruş efektleri.
- **🏃 Troll Parkur (Kedi Mario Tarzı):** 5 zorlu ve komik bölüm, Coyote Time ve Jump Buffer ile akıcı kontroller, kaçan bayrak, lazer engelleri ve Trollface Boss dövüşü.
- **🛡️ 2D Tank Savaşı:** Çok oyunculu tank arenası, seken mermiler, palet izleri, zırh kalkanları ve kıvılcım/patlama efektleri.
- **🧟 Zombs.io & Survivor:** Çok oyunculu zombi hayatta kalma, üs kurma ve dalga savunması.
- **⭕ SOS & XOX:** Çok oyunculu ve Yapay Zekalı zeka oyunları.
- **⛏️ Minecraft Web (Eaglercraft 1.8.8):** Tarayıcı üzerinden kesintisiz çalışan Minecraft istemcisi.
- **🎨 PixelPlace:** Gerçek zamanlı ortak piksel tuvali ve korumalı alanlar.

## 🚀 7/24 Kesintisiz Yayın (Render + Cron-Job)
1. **GitHub'a Yükleyin:** Bu depoyu GitHub hesabınıza aktarın (`main` dalı).
2. **Render.com'da Web Service Açın:**
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. **7/24 Uyumama Ayarı:**
   - [cron-job.org](https://cron-job.org) adresinde ücretsiz bir hesap açın.
   - Render sitenizin adresini (örn: `https://bilisim-arenasi.onrender.com/ping`) her **5 dakikada bir** pingleyecek şekilde zamanlayın. Böylece sunucu asla uyumaz, 7/24 açık kalır!

## 📦 Yerel Kurulum & Çalıştırma
```bash
npm install
npm start
```
Tarayıcınızda `http://localhost:3000` adresine gidin.

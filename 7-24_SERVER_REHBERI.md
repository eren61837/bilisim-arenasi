# 🌐 BİLİŞİM ARENASI - 7/24 SERVER & DOMAIN KURULUM REHBERİ

> **Sistem Geliştirici:** Halil Eren  
> **Açıklama:** Bilgisayarınızı açık tutmadan, tüm okullardan ve sınıflardan MEB engeline takılmadan 7/24 erişim rehberi.

---

## 🎯 1. Neden Yerel IP (192.168.0.27) Başka Sınıflarda Çalışmaz?
* `192.168.0.27` adresi sadece **aynı Wi-Fi modeme / switch'e bağlı olan bilişim sınıfı bilgisayarlarında** çalışır.
* Başka bir sınıftaysanız veya okulun farklı bir ağındaysanız **bu IP'ye ulaşılamaz**.
* Bu yüzden portalda **herkesin girebileceği genel canlı link** birincil yapıldı:  
  👉 **`https://planets-camping-vip-systematic.trycloudflare.com`**

---

## 🚀 2. Kendi PC'niz Olmadan 7/24 Ücretsiz Barındırma (Bulut Sunucu)

Bilgisayarınızı kapatıp oyunu 7/24 açık tutmak için ücretsiz Node.js bulut sağlayıcıları:

### Seçenek A: Render.com (En Kolay & Ücretsiz)
1. **[render.com](https://render.com)** sitesine ücretsiz üye olun.
2. `New +` -> `Web Service` seçin.
3. Bu klasörü (`PixelPlace-Web`) GitHub hesabınıza yükleyip bağlayın.
4. Ayarlar:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Render size kalıcı ücretsiz bir domain verir (örn: `https://bilisim-arena.onrender.com`).
6. **Sonuç:** PC'niz kapalı olsa bile tüm sınıflar ve öğrenciler 7/24 bu linkten girer!

### Seçenek B: Sabit Ücretsiz Domain (DuckDNS + Cloudflare)
Eğer kendi bilgisayarınızda veya okulda bir sunucuda çalıştıracaksanız ve linkin hiç değişmemesini istiyorsanız:
1. **[duckdns.org](https://www.duckdns.org)** sitesine girip ücretsiz bir domain alın (örn: `bilisimarenasi.duckdns.org`).
2. Cloudflare ücretsiz hesabı açıp `cloudflared tunnel create bilisim` diyerek kalıcı sabit tünel oluşturabilirsiniz.

---

## ⚽ 3. Kafa Topu: Beyaz Saray (Yusuf Kaan)
* Orijinal masaüstü `kafatopu.py` oyununun tüm kaynak kodları, görselleri ve fiziği 1:1 olarak web canvas motoruna aktarıldı.
* **Görseller:** `background.jpg` (Beyaz Saray Sahası), `menu_bg.jpg` (Menü), `p1.png` & `p2.png` (Karakterler), `p1_ayak.png` & `p2_ayak.png` (Şut ayakları), `ball.png` (Top).
* **Fizik:** 1280x720 çözünürlük, 60 FPS, zıplama, seken toplar, kale traversleri, gol algılama, süre, konfeti ve yağmur bulutu efektleri.
* **Kontroller:**
  - **1. Oyuncu:** `W` (Zıpla), `A-D` (Hareket), `N` (Alçak Şut), `M` (Yüksek Şut)
  - **2. Oyuncu:** `Ok Tuşları`, `Sol Tık / J` (Yüksek Şut), `Sağ Tık / K` (Alçak Şut)

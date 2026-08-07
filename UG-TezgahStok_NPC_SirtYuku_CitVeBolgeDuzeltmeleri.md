# UG - Tezgâh Stok Mekaniği, NPC Sırt Yükü, Çit ve Bölge Düzeltmeleri Entegrasyon Test Dokümanı

Bu doküman, oyuna eklenen Tezgâh Stok Mekaniği, Taşıyıcı NPC Sırt Yükü Görselleri, Dinamik Çit Doldurucusu, Kilitli Bölge Ağaç Koruması ve Satın Alma Alanı Rezervasyon Haritasını test etmeniz için hazırlanmıştır.

---

## 🧪 Test Adımları ve Doğrulama

### 1. Dinamik Çit Doldurucusu Testi
- **Adım:** Oyunu başlatın ve henüz Bıçkıhane/Tahta Tezgâhı açılmamışken yol kenarındaki (Doğu duvarı) çitleri inceleyin.
- **Beklenen Sonuç:** Tahta Tezgâhı yerinde hiçbir boşluk veya delik yoktur, dinamik doldurucu çit geçici olarak duvarı kapatır. Bıçkıhane kurulup Tahta Tezgâhı açıldığında bu çit otomatik kaldırılır.

### 2. Kilitli Bölge Ağaç Koruması & Gösterge Testi
- **Adım:** Çit kenarına geçin ve kilitli komşu bölgedeki ağaçların yakınına yaklaşın.
- **Beklenen Sonuç:** Kilitli ağaçların altında beyaz menzil halkaları (`rangeIndicator`) ve can barları KESİNLİKLE görünmez. Çit üzerinden baltayla kilitli bölge ağaçlarına vurulamaz.

### 3. Satın Alma Alanları (BuildZone) Ağaç Temizliği Testi
- **Adım:** Satın alma karelerini (`20 💵`, `50 💵`, `80 💵` vb.) ve binaları inceleyin.
- **Beklenen Sonuç:** Satın alma alanlarının veya binaların tam üzerinde veya içinde hiçbir ağaç doğmaz, alanlar tamamen açıktır.

### 4. Kilitli Bölge Çitleri & Köşe Hizalama Testi
- **Adım:** Açılmamış bölgelerin sınır çitlerini ve köşelerini inceleyin.
- **Beklenen Sonuç:** Bölge açılmadan dış çitler görünmez. Köşelerde çit panelleri birbirine milimetrik tam oturur.

### 5. Tezgâh Stok Mekaniği ve Satış Şartı Testi
- **Adım:** Kütükleri İstasyona veya doğrudan Kütük Tezgâhına (`logTrader`) taşıyın.
- **Beklenen Sonuç:** Kütükler Tezgâha taşındıkça Kütük Tezgâhı üzerinde normal boyutta kütükler kat kat dizilir. Müşteriler yalnızca tezgâhta kütük stoku biriktiğinde satın alma işlemini tamamlar.

### 6. Taşıyıcı NPC Sırt Yükü Görsel Testi
- **Adım:** İkmal İstasyonu yanından Kütük Taşıyıcı NPC'sini işe alın.
- **Beklenen Sonuç:** Taşıyıcı NPC kütüğü elinde değil, tıpkı ana karakter gibi tam sırtında hizalı olarak taşır.

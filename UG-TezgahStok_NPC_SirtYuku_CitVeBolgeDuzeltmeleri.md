# UG - Tezgâh Stok Mekaniği, NPC Sırt Yükü, Çit ve Bölge Düzeltmeleri Entegrasyon Test Dokümanı

Bu doküman, oyuna eklenen Tezgâh Stok Mekaniği, Taşıyıcı NPC Sırt Yükü Hizalaması, Yeni Bölge Ağaç Görünürlüğü Fixi, Dinamik Çit Doldurucusu ve Kilitli Bölge Ağaç Korumasını test etmeniz için hazırlanmıştır.

---

## 🧪 Test Adımları ve Doğrulama

### 1. Yeni Açılan Bölge Ağaç Görünürlüğü Testi
- **Adım:** Yeni bir bölge satın alıp açın (Kuzey, Güney veya Batı ormanı).
- **Beklenen Sonuç:** Bölge açıldığı an tüm ağaçlar görünür (`visible = true`) ve anında kesilebilir hale gelir. Ağaçların görünmez kalıp kesilebilmesi hatası tamamen çözülmüştür.

### 2. Taşıyıcı NPC Sırt Yükü Görsel Testi
- **Adım:** Kütük Taşıyıcı veya Tahta Taşıyıcı NPC'sini işe alın.
- **Beklenen Sonuç:** Taşıyıcı NPC kütüğü elinde değil, oyuncu ile birebir aynı pozisyonda (`Z = -0.42`, `Y = 0.85`) ve yatay silindir rotasyonunda (`rotation.z = Math.PI / 2`) sırtında taşır.

### 3. Tezgâh Stok Kütük Dizilimi Testi
- **Adım:** Kütükleri Tezgâha (`logTrader`) taşıyın.
- **Beklenen Sonuç:** Tezgâh üzerindeki kütükler tıpkı oyuncunun sırtındaki gibi yatay silindirler şeklinde kat kat dizilir.

### 4. Dinamik Çit Doldurucusu Testi
- **Adım:** Tahta Tezgâhı henüz açılmamışken yol kenarındaki (Doğu duvarı) çitleri inceleyin.
- **Beklenen Sonuç:** Tahta Tezgâhı yerinde hiçbir boşluk yoktur. Bıçkıhane kurulup Tahta Tezgâhı açıldığında bu çit otomatik kaldırılır.

### 5. Kilitli Bölge Ağaç Koruması Testi
- **Adım:** Çit kenarına geçin ve kilitli komşu bölgedeki ağaçların yakınına yaklaşın.
- **Beklenen Sonuç:** Kilitli ağaçların altında beyaz menzil halkaları ve can barları görünmez, baltayla vurulamaz.

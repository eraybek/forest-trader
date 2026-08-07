# UG - Tezgâh Stok Mekaniği, NPC Sırt Yükü, Çit ve Bölge Düzeltmeleri Entegrasyon Test Dokümanı

Bu doküman, oyuna eklenen Çit Eksen Hizalama Fixi, Tezgâh Stok Mekaniği, Taşıyıcı NPC Sırt Yükü Hizalaması, Yeni Bölge Ağaç Görünürlüğü Fixi ve Dinamik Çit Doldurucusunu test etmeniz için hazırlanmıştır.

---

## 🧪 Test Adımları ve Doğrulama

### 1. Doğu Duvarı Kesintisiz Çit Hizalama Testi
- **Adım:** Oyunda Kuzey, Güney veya Batı bölgesini satın alarak yeni bölgeyi açın.
- **Beklenen Sonuç:** Bölge birleşim noktasındaki (örneğin `Z = 14` veya `Z = -14`) çit kırılması ve yan kayma hatası tamamen çözülmüştür. Tüm yol kenarı doğu çiti `X = -5.0` hattında tek parça halinde **dümdüz ve kusursuz** birleşir.

### 2. Yeni Açılan Bölge Ağaç Görünürlüğü Testi
- **Adım:** Yeni bir bölge satın alın.
- **Beklenen Sonuç:** Bölge açıldığı an tüm ağaçlar görünür (`visible = true`) ve anında kesilebilir hale gelir.

### 3. Taşıyıcı NPC Sırt Yükü Görsel Testi
- **Adım:** Taşıyıcı NPC'yi işe alın.
- **Beklenen Sonuç:** Taşıyıcı NPC kütüğü oyuncu ile birebir aynı pozisyonda (`Z = -0.42`, `Y = 0.85`) ve yatay silindir rotasyonunda sırtında taşır.

### 4. Tezgâh Stok Kütük Dizilimi Testi
- **Adım:** Kütükleri Tezgâha taşıyın.
- **Beklenen Sonuç:** Tezgâh üzerindeki kütükler tıpkı oyuncunun sırtındaki gibi yatay silindirler şeklinde kat kat dizilir.

### 5. Dinamik Çit Doldurucusu Testi
- **Adım:** Tahta Tezgâhı henüz açılmamışken yol kenarındaki çitleri inceleyin.
- **Beklenen Sonuç:** Tahta Tezgâhı yerinde hiçbir boşluk yoktur. Bıçkıhane kurulduğunda otomatik kaldırılır.

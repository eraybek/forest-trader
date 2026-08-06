# UG - Tezgâh Stok Mekaniği, NPC Sırt Yükü, Çit ve Bölge Düzeltmeleri Entegrasyon Test Dokümanı

Bu doküman, oyuna eklenen Tezgâh Stok Mekaniği, Taşıyıcı NPC Sırt Yükü Görselleri, Doğrusal Çit Hizalaması ve Bölge Sınırı Koruması özelliklerini test etmeniz için hazırlanmıştır.

---

## 🧪 Test Adımları ve Doğrulama

### 1. Başlangıç Doğuşu ve Ağaç Temizliği Testi
- **Adım:** Oyunu başlatın.
- **Beklenen Sonuç:** Ana karakter başlangıç noktasında (`Vector3(-8, 0, 0)`) ağaç içinde doğmaz, etrafındaki 5.2 metre yarıçap tamamen açıktır ve karakter anında serbestçe hareket edebilir.

### 2. Tezgâh Stok Mekaniği ve Satış Şartı Testi
- **Adım 1:** Oyunu başlatın ve ağaç keserek sırtınıza kütük toplayın.
- **Adım 2:** Kütükleri İstasyona veya doğrudan Kütük Tezgâhına (`logTrader`) taşıyın.
- **Beklenen Sonuç:** Kütükler Tezgâha taşındıkça Kütük Tezgâhı üzerinde normal boyutta kütükler kat kat dizilmeye başlar. Müşteriler yalnızca tezgâhta kütük stoku biriktiğinde satın alma işlemini tamamlar. Tezgâhta kütük yoksa müşteriler bekler, satış gerçekleşmez.

### 3. Taşıyıcı NPC Sırt Yükü Görsel Testi
- **Adım 1:** İkmal İstasyonu yanından Kütük Taşıyıcı NPC'sini işe alın.
- **Adım 2:** Taşıyıcı NPC'nin İstasyondan kütük alıp Tezgâha doğru yürüyüşünü izleyin.
- **Beklenen Sonuç:** Taşıyıcı NPC kütüğü elinde değil, tıpkı ana karakter gibi tam sırtında hizalı olarak taşır ve tezgâha ulaştığında tezgâh stoğuna ekler.

### 4. Kilitli Bölge Ağaçları ve Sınır Koruması Testi
- **Adım 1:** Henüz kilitli olan Kuzey, Güney veya Batı orman alanlarının sınırındaki ağaçlara yaklaşmayı deneyin.
- **Beklenen Sonuç:** Kilitli bölgelerdeki ağaçlar kendi sınırları içerisindedir, görünmez olarak oyuncu alanına taşmaz ve kilit açılmadan kesilemez/etkileşime girilemez.

### 5. Kesintisiz Çit Hizalaması Testi
- **Adım:** Yol kenarındaki (doğu duvarı) çit hatlarını kontrol edin.
- **Beklenen Sonuç:** Tüm doğu çitleri `X = -5.0` hizasında tam kesintisiz dizilmiştir; bölge birleşim noktalarında hiçbir kayma veya hiza bozukluğu yaşanmaz.

### 6. Taşıyıcı NPC Doğuş Yeri Testi
- **Adım:** Bıçkıhane kurulduğunda Tahta Taşıyıcısı NPC'sini kiralayın.
- **Beklenen Sonuç:** Taşıyıcı NPC Bıçkıhane tezgahının içinde değil, tezgahın önündeki açık zeminde doğar ve takılmadan çalışmaya başlar.

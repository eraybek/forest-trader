# UG - Kayıt ve Çevrimdışı Kazanç Entegrasyon Test Dokümanı

GDD yol haritasının 1. maddesi. İlerleme artık tarayıcıda saklanıyor ve işçiler oyun
kapalıyken de çalışmış sayılıyor.

---

## 🧪 Test Adımları ve Doğrulama

### 1. Kayıt Testi
- **Adım:** Biraz oynayın (bina kurun, NPC tutun, alan alın, seviye atlayın), sonra sayfayı yenileyin ve OYNA'ya basın.
- **Beklenen Sonuç:** Para, seviye, XP, yetenekler, sırt kapasitesi, kurulan tüm yapılar, işe
  alınan tüm NPC'ler, açılan kareler, depo/tezgâh stokları ve tezgâh kasası aynen geri gelir.
  Oyuncu bıraktığı yerde durur.
- **Kayıt anları:** her 5 saniyede bir, her yapı tamamlandığında, sekme arka plana atıldığında
  ve sayfa kapanırken.

### 2. Yarım Ödeme Testi
- **Adım:** Bir satın alma karesinin üstünde durup ödemeyi yarıda bırakın (örneğin 40 paranın 18'ini
  ödeyin), sayfayı yenileyin.
- **Beklenen Sonuç:** Kare yarım ödenmiş hâliyle geri gelir; ilerleme dolgusu ve üzerindeki kalan
  tutar korunur. Ödenen para kaybolmaz.

### 3. Sessiz Geri Yükleme Testi
- **Adım:** Bıçkıhane ve birkaç NPC kurulmuşken oyunu yeniden açın.
- **Beklenen Sonuç:** Yapılar yerinde durur ama "Bıçkıhane kuruldu!", "Taşıyıcı işe alındı!" gibi
  bildirimler **çıkmaz** ve kutlama efektleri oynamaz. Oyun sanki hiç kapanmamış gibi başlar.

### 4. Orman Kararlılığı Testi
- **Adım:** Ağaçların yerini aklınızda tutup oyunu yeniden açın.
- **Beklenen Sonuç:** Orman aynı yerde çıkar. Her kare kendi sabit tohumuyla ağaçlandırıldığı için
  kareleri hangi sırayla satın aldığınız manzarayı değiştirmez.

### 5. Çevrimdışı Kazanç Testi
- **Adım:** Satıcı ve taşıyıcı NPC'ler çalışırken depoda stok bırakıp oyunu kapatın, birkaç saat
  sonra geri dönün.
- **Beklenen Sonuç:** OYNA'ya basınca "İŞÇİLERİN ÇALIŞTI · 3 saat 20 dakika" başlıklı dönüş ekranı
  çıkar; kazanılan para ve satılan mal sayısı görünür. **TOPLA** dokunuşuyla para hesaba geçer ve
  panel kapanır.
- **Kurallar:** en fazla **8 saat** birikir, normal hızın **%50'si** ile çalışır.
- **Simülasyon gerçekçidir:** bıçkıhane girdi kütüklerini tahtaya çevirir, taşıyıcılar depodan
  tezgâha mal taşır, satıcılar gelen müşterilere satar. Stoklar buna göre azalır — para yoktan
  var olmaz, gerçekten elinizdeki maldan gelir.

### 6. Satıcısız Çevrimdışı Testi
- **Adım:** Hiç satıcı NPC tutmadan oyunu birkaç saat kapalı bırakın.
- **Beklenen Sonuç:** Dönüş ekranı çıkmaz. Satacak kimse yoksa para da birikmez; tezgâhı besleyen
  taşıyıcılar varsa yalnızca stok yer değiştirir.

---

## 🐞 Bu turda düzeltilen hata

**Çift istasyon inşa karesi:** `stationBuildPosition` üzerinde iki ayrı inşa karesi vardı. Oyuncu
aynı noktada iki kez ödeme yapıyor ve istasyon üst üste iki kez kuruluyordu (`stations` dizisine iki
kayıt giriyor, kütük yığınları çakışıyordu). Yalnızca sonraki inşa karelerini de açan asıl kare
bırakıldı.

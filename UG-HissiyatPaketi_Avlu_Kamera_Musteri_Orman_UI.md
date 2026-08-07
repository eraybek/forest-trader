# UG - Hissiyat Paketi: Kompakt Avlu, Kamera, Müşteri, Orman ve Mobil UI

Bu paket oyunun sistemlerini değiştirmez; **nasıl hissettirdiğini** düzeltir. Beş başlıkta
toplanır: üs yerleşimi, kamera çerçevesi, müşteri sabrı, orman yenilenmesi ve mobil arayüz.

---

## 🧪 Test Adımları ve Doğrulama

### 1. Kompakt Avlu Testi
- **Adım:** Oyuna girin ve üssü kurun (istasyon, bıçkıhane, satıcı ve taşıyıcılar).
- **Beklenen Sonuç:** Kütük deposu (`-12.5, 4.6`) ve bıçkıhane (`-12.5, -4.6`) artık haritanın
  batı ucunda değil, tezgâhların hemen arkasındaki avluda. Tüm satın alma kareleri ve yapılar
  tek bakışta görünür; orman avlunun dışındaki halkada kalır.
- **Ölçüm:** Depodan kütük tezgâhına mesafe ~6 birim (eskiden ~17). Taşıyıcı NPC'nin gidiş-dönüşü
  belirgin şekilde kısalır.

### 2. Kamera Çerçevesi Testi (Dikey Telefon)
- **Adım:** Oyunu telefonda dikey olarak açın.
- **Beklenen Sonuç:** Ortografik çerçeve artık sabit değil; ekranda **yatayda en az 14 birim**
  görünecek şekilde otomatik uzaklaşır. Dikey telefonda görüş alanı 10.6 × 23'ten **14 × 30**'a
  çıkar, ekranın üst yarısındaki boş çim yerini üs ve ormana bırakır. Masaüstünde çerçeve
  eskisi gibi kalır (alt sınır 24).

### 3. Müşteri Sabrı Testi
- **Adım:** Tezgâhı boş bırakıp uzun süre ormanda kalın.
- **Beklenen Sonuç:** Hiçbir alıcı gitmez; "Alıcı bekleyemedi ve gitti" mesajı artık yoktur.
  Alıcılar sırası gelene kadar tezgâhın önünde bekler. Kuyruk dolduğunda (4 kişi) yeni alıcı
  gelmez, biri satış alınca yeri açılır.

### 4. Talep Görünürlüğü Testi
- **Adım:** Tezgâhın önünde birden fazla alıcı biriktirin.
- **Beklenen Sonuç:** Artık **her bekleyen alıcının** kafasında ne istediği yazar (eskiden
  yalnızca en öndeki gösteriyordu). Oyuncu ormandan bakınca bile tezgâhın neye ihtiyacı
  olduğunu okuyabilir.

### 5. Orman Yenilenmesi Testi
- **Adım:** Bir ağacı devirin ve yerini izleyin.
- **Beklenen Sonuç:** Ağaç sahneden silinmez; devrildikten sonra yerinde bir **fidan** kalır ve
  zamanla büyüyerek tekrar kesilebilir hâle gelir. Süre kademeye bağlıdır: yakın orman 26 sn,
  orta 40 sn, derin orman 54 sn. Böylece oyuncu ormanı tüketip kilitlenemez; uzak kareler
  hâlâ daha değerli çünkü odunları pahalı ve yenilenmeleri yavaş.

### 6. Mobil Arayüz Testi
- **Adım:** Telefonda dikey oynayın.
- **Beklenen Sonuç:**
  - Kaynak çipleri sol üstte **tek satır** (eskiden alt alta üç kule).
  - Seviye çubuğu kaynakların hemen altında; **sol alt köşe joystick için tamamen boş**.
  - "Yetenek" butonu artık ekranın ortasında asılı değil, **sağ alt köşede** — başparmak
    mesafesinde.
  - Toast mesajları ekranın ortasını kapatmıyor, seviye çubuğunun altından akıyor.
  - Bağlam ipucu alt merkezde.

### 7. Hareket İpucu Testi
- **Adım:** Oyuna ilk kez girin ve hiçbir yere dokunmayın.
- **Beklenen Sonuç:** Alt merkezde yanıp sönen "Yürümek için ekrana bas ve sürükle" ipucu durur;
  ekrana ilk dokunuşta kalıcı olarak kaybolur.

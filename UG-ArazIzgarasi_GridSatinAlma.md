# UG - Arazi Izgarası ve Grid Satın Alma Entegrasyon Test Dokümanı

Arazi artık eşit kareli bir ızgaradır. Oyuncu tek bir kareyle başlar ve komşu kareleri
satın alarak her yönde **aynı büyüklükte** alan kazanır. Çit hattı ızgaradan türetildiği
için sınırlar her zaman nizami ölçülerde ve kesintisizdir.

---

## 📐 Izgara Ölçüleri

- Kare boyu: **27 × 27 birim** (kare, tüm yönlerde birebir aynı).
- Izgara: **3 sütun × 3 satır = 9 kare**. Başlangıç karesi `(0,0)`; satın alınabilir 8 kare.
- Doğu (+X) yönü ızgaranın sabit kenarıdır: orası yol ve tezgâh hattıdır, satın alınamaz.
  Büyüme batı, kuzey ve güney yönlerinde olur.
- Kare fiyatı ızgara mesafesine göre: 1 adım **20**, 2 adım **55**, 3 adım **110** para.

---

## 🧪 Test Adımları ve Doğrulama

### 1. Başlangıç Karesi Testi
- **Adım:** Oyuna girin ve çevrenize bakın.
- **Beklenen Sonuç:** Başlangıç alanı tam bir kare; dört yanı da çitle çevrili. Yalnızca
  yol kenarındaki iki tezgâh ağzı açıktır. Kare içinde üç satın alma karesi görünür:
  kuzey, güney ve batı kenarlarının tam ortasında.

### 2. Eşit Alan Testi
- **Adım:** Önce kuzeyi, sonra batıyı satın alın.
- **Beklenen Sonuç:** Her satın alma tam olarak aynı büyüklükte (27 × 27) alan ekler.
  Hiçbir yön diğerinden geniş veya dar değildir.

### 3. Çit Hizası Testi
- **Adım:** Yeni kare açıldıktan sonra sınır çitini baştan sona izleyin.
- **Beklenen Sonuç:** İki kare arasındaki bölme çiti tamamen kalkar; dış sınır tek parça
  hâlinde uzar. Kare köşelerinde kırılma, kayma veya boşluk yoktur — tüm çit koşuları
  aynı yönde (küçük eksenden büyüğe) çizildiği için paneller milimetrik buluşur.

### 4. Izgara Şekli Testi (İç Köşe)
- **Adım:** Kuzey ve batı karelerini alıp kuzey-batı köşesini **almayın**.
- **Beklenen Sonuç:** Açık alan L şeklindedir ve çit bu L'nin dış hattını kusursuz takip
  eder; alınmayan köşe karesi çitle dışarıda bırakılır.

### 5. Yeni Satın Alma Karesi Testi
- **Adım:** Bir kare aldıktan sonra yeni sınıra bakın.
- **Beklenen Sonuç:** Yeni açılan karenin komşusu olan kilitli karelerin satın alma
  kareleri belirir; her biri ortak kenarın tam ortasında ve **sizin tarafınızda** durur,
  yani her zaman ulaşabilirsiniz.

### 6. Sınır Testi
- **Adım:** Açık alanın her kenarına doğru yürüyün.
- **Beklenen Sonuç:** Açık komşusu olan kenardan serbestçe geçersiniz; kilitli komşusu
  olan kenarda çitin hemen önünde durursunuz. Alan L veya T şeklindeyken de her açık
  karenin tamamı gezilebilir.

### 7. Ağaç Kademesi Testi
- **Adım:** Uzak kareleri açıp ağaçları karşılaştırın.
- **Beklenen Sonuç:** Merkezden uzaklaştıkça ağaç kademesi yükselir (0 → 1 → 2): daha uzun
  kesilen ama daha çok ve daha değerli kütük veren ağaçlar. Kareler yalnızca satın
  alındıklarında ağaçlandırılır, bu yüzden oyunun açılışı ızgara büyüdükçe yavaşlamaz.

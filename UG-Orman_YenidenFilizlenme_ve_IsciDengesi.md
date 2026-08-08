# UG - Orman Yeniden Filizlenmesi ve İşçi Dengesi Test Dokümanı

Cihazda yapılan testte ormanın "çöplüğe döndüğü" tespit edildi. Sebep tek değil, üç ayrı
şeydi ve üçü de bu turda düzeltildi.

| Sorun | Sebep | Çözüm |
|---|---|---|
| Yerde 20+ kütük | Oduncu, Toplayıcı'dan ~2 kat hızlı üretiyordu | Toplayıcı hızlandı ve kapasitesi arttı, Oduncu yavaşladı |
| Ormanda kalıcı kütük ve sarı daireler | Kesilen yuva yerinde bekliyordu | Yuva iz bırakmadan kayboluyor, başka noktada filizleniyor |
| Tohum toplayıp dikme yükü | Manuel dikim mekaniği | Dikim, tohum ve tohum sayacı tamamen kaldırıldı |

---

## 🌲 Yeni orman modeli

Kesilen ağaç yerinde **hiçbir iz bırakmaz**. Yuva görünmez olarak bir süre bekler
(`dormant`), sonra karenin **başka bir boş noktasında** fidan olarak filizlenir ve büyür.
Orman zamanla yer değiştirir; kare başına üretim tavanı ise aynı kalır — yani arazinin
"kapasite" olma anlamı korunur.

| Kademe | Bekleme | Büyüme | Toplam döngü |
|---|---|---|---|
| Çam (başlangıç) | 8 sn | 5 sn | 13 sn |
| Kayın (1. halka) | 11 sn | 7 sn | 18 sn |
| Meşe (2-3. halka) | 14 sn | 9 sn | 23 sn |

---

## 🧪 Test Adımları ve Doğrulama

### 1. İz Bırakmama Testi
- **Adım:** Bir ağacı devirin ve yerine bakın.
- **Beklenen Sonuç:** Ne kütük, ne sarı daire, ne de başka bir kalıntı kalır. Zemin tamamen
  temizdir. Üst şeritte tohum sayacı da yoktur — kaynak çipleri tekrar üç tanedir.

### 2. Başka Noktada Filizlenme Testi
- **Adım:** Birkaç ağaç kesip ormanın desenini izleyin.
- **Beklenen Sonuç:** Kesilen ağaç eski yerinde değil, karenin başka bir boş noktasında
  fidan olarak belirir ve büyür. Orman zamanla yer değiştirir.
- **Not:** Orman doluyken yeni bir boş nokta bulunamazsa ağaç eski yerinde filizlenir.
  Bu bilinçli bir geri düşüş — kare zaten kapasitesindedir, gidecek yer yoktur.

### 3. Kütük Yığılması Testi
- **Adım:** Oduncu ve Toplayıcı çalışırken yere bakın.
- **Beklenen Sonuç:** Yerdeki kütük sayısı **0-6** arasında gider gelir, yığılmaz.
  (Eskiden 20'yi aşıp ormanı dolduruyordu.) Sert tavan da 60'tan **20**'ye indirildi.
- **Ölçüm:** Depo stoğu düzenli artmalı — testte 60 saniyede 0 → 10 kütük.

### 4. Ormancı Testi
- **Adım:** Ormancı'yı (eski Ekici) işe alıp izleyin.
- **Beklenen Sonuç:** Artık tohum ekmez. En yakın **fidana** gider, sular (mavi parçacık) ve
  fidanın kalan büyüme süresinden **3 saniye** düşer. Yani karenin üretim tavanını yükseltir.
  Sulanacak fidan yoksa çalışma alanının çevresinde dolanır.

### 5. Tam Otomasyon Testi
- **Adım:** Ormancı, Oduncu, Toplayıcı, Taşıyıcı ve Satıcı kuruluyken kenara çekilin.
- **Beklenen Sonuç:** Orman kendini yeniler, kütükler depoya, oradan tezgâha gider ve
  satılır. Olgun ağaç sayısı 27-28 civarında sabit kalır — üretim ile yenilenme dengededir.

### 6. Eski Kayıt Uyumu Testi
- **Adım:** Bu güncellemeden önceki bir kayıtla oyunu açın.
- **Beklenen Sonuç:** Oyun açılır. Eski kayıttaki boş yuvalar (`e`) bekleyen yuvaya
  dönüştürülür ve kısa sürede yeni yerlerinde filizlenir. Tohum sayısı kayıttan sessizce
  düşer, hata vermez.

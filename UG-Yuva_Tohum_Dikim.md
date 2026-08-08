# UG - Ağaç Yuvası, Tohum ve Dikim Entegrasyon Test Dokümanı

GDD yol haritasının 2. maddesi. Anında yenilenme kaldırıldı; ormanın kalbi artık
**ağaç yuvası** kavramı. Bir ağaç nesnesi bir yuvadır ve üç durumu vardır: boş, fidan, olgun.

> **Neden değişti:** kesilen ağaç kendiliğinden geri geldiği sürece tek bir kare sonsuz kaynak
> olur ve alan almanın hiçbir matematiksel karşılığı kalmaz. Yuva modelinde bir karenin
> sürdürülebilir üretimi `yuva sayısı ÷ büyüme süresi` oranına oturur — yani arazi bir stok
> değil, bir kapasitedir.

---

## 🧪 Test Adımları ve Doğrulama

### 1. Yuva Boşalması Testi
- **Adım:** Bir ağacı devirin.
- **Beklenen Sonuç:** Ağaç yok olmaz ve **geri de gelmez**. Yerinde bir **kütük** kalır, zeminde
  sıcak sarı bir **dikim işareti** nefes alır ("burada iş var"). Yuva biri tohum ekene kadar
  boş kalır.

### 2. Tohum Düşme Testi
- **Adım:** Ağacı devirdikten sonra tohum sayacını izleyin.
- **Beklenen Sonuç:** Kütüklerin yanında bir tohum havalanıp oyuncuya uçar ve üst şeritteki
  tohum çipi **+1** artar. Her devrilen ağaç tam **1 tohum** verir; yani kestiğiniz kadar
  ekebilirsiniz — döngü kendi kendini besler, ayrı bir tohum ekonomisi yoktur.

### 3. Otomatik Dikim Testi
- **Adım:** Elinizde tohum varken boş bir yuvanın üstüne yürüyün.
- **Beklenen Sonuç:** Buton yok. Yuvaya yaklaşınca (1.5 birim) tohum kendiliğinden ekilir:
  tohum sayacı 1 azalır, kütük ve işaret kaybolur, yerinde fidan belirir. Tohumunuz yoksa
  hiçbir şey olmaz.

### 4. Büyüme Testi
- **Adım:** Diktiğiniz fidanı izleyin.
- **Beklenen Sonuç:** Fidan kademeye göre büyür ve olgunlaşınca tekrar kesilebilir hâle gelir:
  yakın orman **5 sn**, orta **7 sn**, derin orman **9 sn**. Fidan büyürken kesilemez ve
  yürümenizi engellemez; yalnızca olgun gövde katıdır.

### 5. Rüzgârla Tohum Testi
- **Adım:** Tüm tohumlarınızı harcayıp bekleyin.
- **Beklenen Sonuç:** Yaklaşık **55 saniyede bir** boş yuvalardan biri kendiliğinden filizlenir.
  Bu bir üretim kaynağı değil, emniyet supabıdır: oyuncu tohumsuz ve parasız kalsa bile oyun
  akmaya devam eder, kilitlenme imkânsızdır.

### 6. Tohum Sayacı Testi
- **Adım:** Üst şeride bakın.
- **Beklenen Sonuç:** Para, sırt, depo ve **tohum** çipleri tek satırda durur. Çipler satıra
  sığmazsa alta kayar ve seviye çubuğu da onlarla birlikte iner — üst üste binmez.

### 7. Kayıt Testi
- **Adım:** Birkaç ağaç kesip yuvaları boş bırakın, sayfayı yenileyin.
- **Beklenen Sonuç:** Boş yuvalar **boş** geri gelir; orman kendini doldurmuş olmaz. Fidanlar
  fidan olarak, tohum sayınız da aynen korunur. (Kesilen ormanı yeniden açarak sıfırlamak
  mümkün değil.)

---

## 🐞 Bu turda düzeltilen hata

**Materyal klonlama çökmesi:** `makeTree` içindeki traverse her ağaç meshine kendi materyal
kopyasını veriyor (`child.material.clone()`), ama bu tek materyal varsayıyor. Kütüğe dizi
materyal verilince `material.clone is not a function` hatasıyla oyun açılışta komple çöküyordu.
Kütük tek materyale çevrildi, zemindeki dikim işareti ise paylaşılan materyalde kalması için
traverse'ten muaf tutuldu — böylece nabız animasyonu tek atamayla tüm işaretlere uygulanıyor.

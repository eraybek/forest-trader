# UG - NPC Sırt Yükü, Tezgâh Kasası ve Boşta Gezinme Entegrasyon Test Dokümanı

Bu doküman, taşıyıcı NPC'lerin yükü sırtta taşıması, tezgâhın mal/para olarak ikiye
ayrılması ve boştaki NPC'lerin çalışma alanı çevresinde dolanması özelliklerini test
etmeniz için hazırlanmıştır.

---

## 🧪 Test Adımları ve Doğrulama

### 1. Taşıyıcı NPC Sırt Yükü Testi
- **Adım:** Kütük Taşıyıcısını (ve Bıçkıhane sonrası Tahta Taşıyıcısını) işe alın, yük taşırken izleyin.
- **Beklenen Sonuç:** Yük artık NPC'nin **önünde/elinde değil, sırtında** durur. Oyuncu ile
  taşıyıcı yan yana geldiğinde iki yük de aynı hizadadır; ikisi de aynı sabitleri
  (`CARRY_BACK_OFFSET_Z = 0.68`, `CARRY_BASE_Y = 0.34`) kullanır.

### 2. Tezgâh Mal / Para Ayrımı Testi
- **Adım:** Tezgâha kütük (veya tahta) bırakın ve bir müşteriye satış yapılmasını bekleyin.
- **Beklenen Sonuç:** Tezgâh tablasının bir yarısında (kuzey, `-Z`) satılan mal — tezgâh
  tipine göre kütük veya tahta — dizilir; diğer yarısında (güney, `+Z`) müşterilerin
  ödediği banknotlar deste deste birikir.

### 3. Tezgâh Kasası Toplama Testi
- **Adım:** Satıcı NPC'yi işe alıp tezgâhtan uzaklaşın, birkaç satış olsun; sonra tezgâhın
  iç yüzündeki halkaya gidin.
- **Beklenen Sonuç:** Uzaktayken para tezgâhta birikir ve destenin boyu satış başına büyür.
  Halkaya girdiğiniz an banknotlar size uçar, `Tezgâh kasası toplandı · +N para` bildirimi
  çıkar ve altın sayacı artar. Hiçbir ödeme kaybolmaz.

### 4. Boştaki NPC Gezinme Testi
- **Adım:** İstasyonda kütük (veya bıçkıhanede tahta) bitene kadar bekleyin ve taşıyıcıyı izleyin.
- **Beklenen Sonuç:** Taşıyıcı artık kaynağın üzerine koşup orada tepinmez. Bunun yerine
  yapının çevresindeki 2.3–3.6 birimlik halkada sağa sola, **dura kalka** yürür: bir noktaya
  yürür, 0.8–2.6 saniye `idle` klibiyle bekler, sonra yeni bir noktaya geçer. Yeni nokta hep
  mevcut açıya yakın seçildiği için NPC binanın ortasından geçmez.

### 5. İş Gelince Göreve Dönme Testi
- **Adım:** Taşıyıcı boşta gezinirken bir ağaç kesip istasyona kütük bırakın.
- **Beklenen Sonuç:** Taşıyıcı gezinmeyi anında bırakır, kaynağa yönelir, yükü sırtına alıp
  tezgâha götürür.

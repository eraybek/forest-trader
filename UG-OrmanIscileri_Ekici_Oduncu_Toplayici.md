# UG - Orman İşçileri (Ekici · Oduncu · Toplayıcı) Entegrasyon Test Dokümanı

GDD yol haritasının 3. maddesi: otomasyon merdiveninin gövdesi. Bu üç NPC birlikte
**orman → depo** hattını tamamen oyuncunun elinden alır. Mevcut Taşıyıcı ve Satıcı ile
birleşince oyun uçtan uca kendi kendine döner.

---

## 🪜 İşe Alım Merdiveni

Üç kare aynı anda açılmaz; her işe alım bir sonrakini doğurur. Böylece oyuncu altı
satın alma karesiyle aynı anda karşılaşmaz.

| Sıra | NPC | Açan olay | Maliyet | Devraldığı iş |
|---|---|---|---|---|
| 1 | **Ekici** | Kütük deposu kurulunca | 120 | Dikim |
| 2 | **Oduncu** | Ekici işe alınınca | 260 | Balta |
| 3 | **Toplayıcı** | Oduncu işe alınınca | 420 | Toplama ve depoya taşıma |

Üç kare de ormanın içinde, avlunun batısında sıralanır (`x = -21`, `z = 8.5 / 0 / -8.5`).

---

## 🧪 Test Adımları ve Doğrulama

### 1. Merdiven Testi
- **Adım:** Kütük deposunu kurun, sonra sırayla Ekici ve Oduncu'yu işe alın.
- **Beklenen Sonuç:** Depo kurulunca **Ekici** karesi belirir. Ekici alınınca **Oduncu**,
  Oduncu alınınca **Toplayıcı** karesi açılır. Hiçbir aşamada üçü birden görünmez.

### 2. Ekici Testi
- **Adım:** Elinizde tohum varken Ekici'yi izleyin.
- **Beklenen Sonuç:** En yakın boş yuvaya yürür, kısa bir dikim molası verir, tohum sayacı
  1 azalır ve yuvada fidan belirir. Tohum bittiğinde iş aramayı bırakıp çalışma alanının
  çevresinde dura kalka dolanır; tohum gelince kendiliğinden işe döner.

### 3. Oduncu Testi
- **Adım:** Oduncu'yu izleyin.
- **Beklenen Sonuç:** En yakın olgun ağaca yürür, balta klibiyle vurur ve ağacı devirir.
  Devrilen ağaç kütüklerini yere döker ve tohumunu **oyuncuya** uçurur — yani Oduncu
  çalıştıkça Ekici'nin tohumu da birikir. Kesim size XP kazandırır.

### 4. Toplayıcı Testi
- **Adım:** Yerde kütük varken Toplayıcı'yı izleyin.
- **Beklenen Sonuç:** En yakın kütüğe gider, sırtına alır (oyuncununkiyle aynı hizada),
  sırtı dolunca (taşıyıcı kapasitesi kadar) depoya yürür ve tek tek boşaltır. Depo stoğu
  artar, kütüğün değeri de stok değerine eklenir.

### 5. Tam Otomasyon Testi
- **Adım:** Üçünü de işe alın, Taşıyıcı ve Satıcı da kuruluysa oyuncuyu kenara çekip bekleyin.
- **Beklenen Sonuç:** Oyuncu hiçbir şey yapmadan döngü döner: ağaçlar kesilir, yuvalar
  yeniden ekilir, kütükler depoya, oradan tezgâha gider ve müşterilere satılır. Ormanın
  olgun ağaç sayısı dengede kalır — Ekici, Oduncu'ya yetiştiği sürece orman tükenmez.

### 6. Hedef Çakışması Testi
- **Adım:** Aynı işten birden fazla NPC olduğunda izleyin (veya oyuncuyla aynı ağacı kesmeye çalışın).
- **Beklenen Sonuç:** İki işçi aynı ağaca koşmaz; hedefler paylaşılmaz. Oyuncu, bir işçinin
  hedefindeki ağacı kendisi devirirse işçi hedefini bırakıp yenisini arar.

### 7. Yer Doluluk Sınırı Testi
- **Adım:** Toplayıcı'yı işe almadan Oduncu'yu uzun süre çalıştırın.
- **Beklenen Sonuç:** Yerdeki kütük sayısı **60**'a ulaşınca Oduncu kesmeyi bırakıp dolanmaya
  geçer. Yer sonsuz kütükle dolup performansı düşürmez; Toplayıcı gelince kesim yeniden başlar.

### 8. Kayıt Testi
- **Adım:** Üç işçiyi de tutup sayfayı yenileyin.
- **Beklenen Sonuç:** Üçü de yerinde durur ve çalışmaya kaldığı yerden devam eder.

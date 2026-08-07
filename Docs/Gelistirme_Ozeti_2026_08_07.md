# Geliştirme Özeti - 07.08.2026

## Yapılan Güncellemeler ve İyileştirmeler (Tam Liste)

1. **Dinamik Tahta Tezgâhı Çit Doldurucusu (`plankStallFillerFence`):**
   - Oyun başında Tahta Tezgâhı henüz açılmamışken yoldaki boşluğu kapatan dinamik çit paneli eklendi. Bıçkıhane kurulup Tahta Tezgâhı açıldığında çit otomatik gizlenir. Yolda kesinlikle boşluk kalmaz.

2. **Kilitli Bölge Ağaç Etkileşimi ve Gösterge Koruması:**
   - Kilitli bölgelerdeki (henüz açılmamış) ağaçların beyaz menzil halkaları (`rangeIndicator`) ve can barları (`healthBar`) kesin olarak gizlendi.
   - Kilitli bölge ağaçları balta vuruşlarından ve yakınlık hedefleme sisteminden tamamen korumaya alındı. Kilit açılmadan etkileşim kurulamaz.

3. **İnşa ve Satın Alma Alanları (BuildZone) Ağaç Temizlik Haritası:**
   - Tüm satın alma kareleri (`20 💵`, `50 💵`, `80 💵`, vb.) ve bina konumları `ALL_RESERVED_POSITIONS` rezervasyon listesine eklendi.
   - Bu karelerin 4.8 metre etrafında hiçbir ağacın doğmaması garanti edildi. Satın alma karelerinin üzerinde ağaç oluşmaz.

4. **Kilitli Bölge Dış Çitlerinin Gizlenmesi:**
   - Kilitli orman alanlarının dış duvar çitleri bölge satın alınıp açılana kadar gizli tutulur (`run.visible = plot.unlocked`).

5. **Milimetrik Köşe Çit Birleşimi:**
   - Köşe koordinatlarındaki çit panelleri çakışmasız ve boşluksuz tam oturacak şekilde hizalandı.

6. **Tezgâh Stok Mekaniği & Satış Şartı:**
   - Kütük ve Tahta Tezgâhlarına ayrı stok sayaçları (`state.logStallStock`, `state.plankStallStock`) ve normal boyutta üst üste dizilen görsel stok yığınları eklendi. Müşteriler yalnızca tezgâhta önceden getirilmiş stok varsa alışveriş yapabilir.

7. **NPC Taşıyıcı Sırt Yükü Görseli:**
   - Kütük ve Tahta taşıyıcı NPC'ler eşyayı ana karakter gibi tam sırtlarında hizalı şekilde taşır.

8. **Oyuncu Başlangıç Doğuşu & Ağaç Temizliği:**
   - Karakterin doğduğu `Vector3(-8, 0, 0)` etrafındaki 5.2 metre yarıçapta ağaç doğması engellendi. Karakter ağaç içinde doğmaz.

9. **Doğrulama ve Derleme:**
   - `npm run build` komutu ile TypeScript ve Vite derleme kontrolleri 0 hata ile doğrulandı.

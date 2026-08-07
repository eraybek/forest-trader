# Geliştirme Özeti - 07.08.2026

## Yapılan Güncellemeler ve İyileştirmeler (Tam Liste)

1. **Yeni Açılan Bölge Ağaçlarının Görünür Olması Fixi (`unlockPlot` & `makeTree`):**
   - Ağaçlar `makeTree` aşamasında bölgeye ait `plot.trees` listesine otomatik kaydedilerek `unlockPlot(index)` çağrıldığında yeni açılan bölgenin tüm ağaçları anında %100 görünür ve erişilebilir hale getirildi. Ağaçların görünmez kalıp kesilebilmesi sorunu giderildi.

2. **NPC Taşıyıcı Sırt Yükü Pozisyon/Rotasyon Hizalaması (`updateCarriers`):**
   - Taşıyıcı NPC'nin yükü elinde değil, oyuncunun sırtındaki ile birebir aynı pozisyonda (`Z = -0.42`, `Y = 0.85`) ve yatay silindir rotasyonunda (`rotation.z = Math.PI / 2`) sırtına eklendi.

3. **Tezgâh Stok Kütük Dizilimi (`rebuildTraderStock`):**
   - Tezgâhtaki kütükler oyuncu sırtındaki gibi yatay silindirler şeklinde kat kat dizildi.

4. **Dinamik Tahta Tezgâhı Çit Doldurucusu (`plankStallFillerFence`):**
   - Oyun başında Tahta Tezgâhı henüz açılmamışken yoldaki boşluğu kapatan dinamik çit paneli eklendi. Bıçkıhane kurulup Tahta Tezgâhı açıldığında çit otomatik gizlenir.

5. **Kilitli Bölge Ağaç Etkileşimi ve Gösterge Koruması:**
   - Kilitli bölgelerdeki (henüz açılmamış) ağaçların beyaz menzil halkaları (`rangeIndicator`) ve can barları (`healthBar`) gizlendi. Kilit açılmadan etkileşim kurulamaz.

6. **İnşa ve Satın Alma Alanları (BuildZone) Ağaç Temizlik Haritası:**
   - Tüm satın alma kareleri ve bina konumları `ALL_RESERVED_POSITIONS` rezervasyon listesine eklenerek ağaç doğması engellendi.

7. **Doğrulama ve Derleme:**
   - `npm run build` komutu ile TypeScript ve Vite derleme kontrolleri 0 hata ile doğrulandı.

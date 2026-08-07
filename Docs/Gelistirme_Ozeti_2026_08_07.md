# Geliştirme Özeti - 07.08.2026

## Yapılan Güncellemeler ve İyileştirmeler (Tam Liste)

1. **Doğu Duvarı Çit Hizalama Vektör Fixi:**
   - Yeni bölge açıldığında Doğu çitinde oluşan 1.5 metrelik eksen kayması/kırılması çözüldü. Çit modelinin asimetrik yapısı nedeniyle oluşan 180° rotasyon farkı, tüm Doğu çit vektörlerinin (Plot 0, Plot 1, Plot 2) aynı yön sıralamasıyla (büyük Z'den küçük Z'ye) çizilmesi sağlanarak **%100 kusursuz ve dümdüz** hale getirildi.

2. **Yeni Açılan Bölge Ağaçlarının Görünür Olması Fixi (`unlockPlot` & `makeTree`):**
   - Ağaçlar `makeTree` aşamasında bölgeye ait `plot.trees` listesine kaydedildi. `unlockPlot(index)` çağrıldığında yeni açılan bölgenin tüm ağaçları anında %100 görünür ve erişilebilir hale getirildi.

3. **NPC Taşıyıcı Sırt Yükü Pozisyon/Rotasyon Hizalaması (`updateCarriers`):**
   - Taşıyıcı NPC'nin yükü elinde değil, oyuncunun sırtındaki ile birebir aynı pozisyonda (`Z = -0.42`, `Y = 0.85`) ve yatay silindir rotasyonunda (`rotation.z = Math.PI / 2`) sırtına eklendi.

4. **Tezgâh Stok Kütük Dizilimi (`rebuildTraderStock`):**
   - Tezgâhtaki kütükler oyuncu sırtındaki gibi yatay silindirler şeklinde kat kat dizildi.

5. **Dinamik Tahta Tezgâhı Çit Doldurucusu (`plankStallFillerFence`):**
   - Oyun başında Tahta Tezgâhı henüz açılmamışken yoldaki boşluğu kapatan dinamik çit paneli eklendi.

6. **Kilitli Bölge Ağaç Etkileşimi ve Gösterge Koruması:**
   - Kilitli bölgelerdeki ağaçların beyaz menzil halkaları (`rangeIndicator`) ve can barları (`healthBar`) gizlendi.

7. **İnşa ve Satın Alma Alanları (BuildZone) Ağaç Temizlik Haritası:**
   - Tüm satın alma kareleri ve bina konumları `ALL_RESERVED_POSITIONS` rezervasyon listesine eklenerek ağaç doğması engellendi.

8. **Doğrulama ve Derleme:**
   - `npm run build` komutu ile TypeScript ve Vite derleme kontrolleri 0 hata ile doğrulandı.

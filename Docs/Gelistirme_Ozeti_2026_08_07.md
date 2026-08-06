# Geliştirme Özeti - 07.08.2026

## Yapılan Güncellemeler ve İyileştirmeler (Tam Liste)

1. **Tezgâh Stok Mekaniği & Alışveriş Şartı:**
   - Kütük ve Tahta Tezgâhlarına ayrı stok sayaçları (`state.logStallStock`, `state.plankStallStock`) ve normal boyutta üst üste dizilen görsel stok yığınları eklendi.
   - Müşteriler yalnızca tezgâha önceden mal taşınmış ve tezgâhta stok varsa alışveriş yapabilir. Taşınmamış mal satılamaz.

2. **NPC Taşıyıcı Sırt Yükü Görseli:**
   - Kütük ve Tahta taşıyıcı NPC'ler eşyayı ana karakter gibi tam sırtlarında hizalı şekilde taşır.

3. **Oyuncu Başlangıç Doğuşu & Ağaç Temizliği:**
   - Karakterin doğduğu `Vector3(-8, 0, 0)` etrafındaki 5.2 metre yarıçapta ağaç doğması engellendi. Karakter ağaç içinde doğmaz ve sıkışmaz.

4. **Kilitli Bölge Ağaçları ve Sınır Koruması:**
   - Her bölgenin ağaçları kendi `minZ`/`maxZ` ve `COMPOUND_WEST`/`COMPOUND_EAST` sınırları içerisine hapsedildi.
   - Henüz açılmamış kilitli bölgelerdeki ağaçların kesilmesi ve etkileşimi kesin olarak engellendi.

5. **NPC Doğuş Noktaları Düzeltmesi:**
   - Bıçkıhane ve İstasyon taşıyıcı NPC'leri binaların/tezgâhların içinde değil, binaların önündeki açık alanda doğar.

6. **Doğu Yol Çitlerinin Hizalanması:**
   - Tüm Doğu duvarı çitleri kesintisiz `X = -5.0` ekseninde milimetrik hizada birleştirildi.

7. **Yapı Şeffaflaşması (Occlusion):**
   - Karakter Kütük Bırakma İstasyonu, Bıçkıhane veya Tezgâhların arkasına geçtiğinde yapının çatısı ve gövdesi otomatik olarak %32 opaklığa şeffaflaşır.

8. **Doğrulama ve Derleme:**
   - `npm run build` komutu ile TypeScript ve Vite derleme kontrolleri 0 hata ile doğrulandı.

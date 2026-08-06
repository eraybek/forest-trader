# Geliştirme Özeti - 07.08.2026

## Yapılan Güncellemeler ve İyileştirmeler (Tam Liste)

1. **Nizami Yerleşim ve Alan Yönetimi:**
   - İstasyon (`-14, 0, 5.0`) ve Bıçkıhane (`-14, 0, -5.0`) binaları tamamen Plot 0 iç alanına çekildi; çitlerin üzerine binme/kesişme sorunu tamamen giderildi.
   - Hiçbir bina, inşa karesi veya ağaç birbiriyle veya çitlerle çakışmıyor.

2. **Kesintisiz Çit Hattı:**
   - Doğu yol hattındaki çitler tezgâh boşlukları hariç tamamen kesintisiz dizildi; aradaki boşluklar kapatıldı.

3. **3 Yöne Nizami Genişleme Alanları (BuildZone):**
   - **Kuzey Genişleme (Plot 1):** Çitin tam ortasında `Vector3(-15, 0, -7.0)` (Z = -9 çitinin önünde nizami).
   - **Güney Genişleme (Plot 2):** Çitin tam ortasında `Vector3(-15, 0, 7.0)` (Z = 9 çitinin önünde nizami).
   - **Batı Genişleme (Plot 3):** Çitin tam ortasında `Vector3(-22.8, 0, 0)` (X = -25 çitinin önünde nizami).
   - Her genişleme satın alındığında sadece ilgili yönün çit hattı açılır ve oyuncunun alanı büyür.

4. **Kütük ve Tahta Taşıyıcı / Satıcı NPC Sistemleri:**
   - **Kütük Taşıyıcı NPC (`logCarrier`):** İstasyondan kütükleri alıp Kütük Tezgâhına taşır.
   - **Tahta Taşıyıcı NPC (`plankCarrier`):** Bıçkıhane çıktısından tahtaları alıp Tahta Tezgâhına taşır.
   - **Kütük Satıcı NPC (`logSeller`):** Kütük tezgâhı yeşil dairesinde durup satış yapar.
   - **Tahta Satıcı NPC (`plankSeller`):** Tahta tezgâhı turuncu dairesinde durup satış yapar.

5. **Doğrulama ve Derleme:**
   - `npm run build` komutu ile TypeScript ve Vite derleme kontrolleri 0 hata ile doğrulandı.

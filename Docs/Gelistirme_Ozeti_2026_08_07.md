# Geliştirme Özeti - 07.08.2026

## Yapılan Güncellemeler ve İyileştirmeler (Tam Liste)

1. **Üstel (Eksponansiyel) Bırakma / Boşaltma Hız Eğrisi:**
   - İstasyona kütük bırakma, Bıçkıhaneye kütük bırakma/tahta toplama ve İnşa alanlarına kaynak yatırma işlemlerinde üstel hızlandırma eğrisi (`targetInterval = Math.max(0.015, 0.11 * Math.pow(0.85, streak))`) uygulandı.
   - İlk 1-2 eşya normal hızda bırakılırken, oyuncu alanda kaldıkça boşaltma hızı anında katlanarak hızlanır (bırakma süresi 0.11 saniyeden 0.015 saniyeye düşer). Bu sayede oyuncu bekletilmez.

2. **Nizami Yerleşim ve Alan Yönetimi:**
   - İstasyon (`-14, 0, 5.0`) ve Bıçkıhane (`-14, 0, -5.0`) binaları tamamen Plot 0 iç alanına çekildi; çitlerin üzerine binme/kesişme sorunu giderildi.

3. **Kesintisiz Çit Hattı:**
   - Doğu yol hattındaki çitler tezgâh boşlukları hariç tamamen kesintisiz dizildi.

4. **3 Yöne Nizami Genişleme Alanları (BuildZone):**
   - Kuzey (`-15, 0, -7.0`), Güney (`-15, 0, 7.0`) ve Batı (`-22.8, 0, 0`) genişleme kareleri ilgili çitlerin tam ortasında ve oyuncunun iç alanında konumlandırıldı.

5. **Kütük ve Tahta Taşıyıcı / Satıcı NPC Sistemleri:**
   - Kütük ve Tahta Taşıyıcı Worker NPC'leri ile Kütük ve Tahta Satıcı NPC'leri oyuna eklendi.

6. **Doğrulama ve Derleme:**
   - `npm run build` komutu ile TypeScript ve Vite derleme kontrolleri 0 hata ile doğrulandı.

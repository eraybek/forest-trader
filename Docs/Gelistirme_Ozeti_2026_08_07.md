# Geliştirme Özeti - 07.08.2026

## Yapılan Güncellemeler ve İyileştirmeler (Tam Liste)

1. **Genişletilmiş Plot 0 Başlangıç Haritası & Hiyerarşik Hizalama:**
   - Başlangıç Plot 0 alanı genisletilerek (`X: [-32, -5]`, `Z: [-14, 14]`) tüm binalar ve otomasyon kareleri geniş, ferah ve çakışmasız bir grid düzenine oturtuldu.
   - **Kütük Hattı (Güney, Z = 6.5 ~ 7.5):** İstasyon (`-22`) -> Kütük Taşıyıcı (`-15.5`) -> Kütük Satıcısı (`-9.5`) -> Kütük Tezgâhı (`-5`).
   - **Tahta Hattı (Kuzey, Z = -6.5 ~ -7.5):** Bıçkıhane (`-22`) -> Tahta Taşıyıcı (`-15.5`) -> Tahta Satıcısı (`-9.5`) -> Tahta Tezgâhı (`-5`).

2. **Milimetrik Hizalı Doğu Yolu Çitleri:**
   - Doğu yol hattındaki tüm çitler tam olarak `X = -5.0` hizasında birleştirilerek tezgâh yanlarındaki kaymalar ve bozulmalar giderildi.

3. **Tezgâhların Karşısındaki Batı Ormanı Genişlemesi (Plot 3):**
   - Tezgâhların tam karşısındaki Batı duvarında (`X = -32, Z = 0`) genişleme inşa karesi konumlandırıldı.
   - Satın alındığında `COMPOUND_WEST` `-56.0`'ya genişler, çim zemin uzar ve batı ormanı tamamen açılır.

4. **Aşamalı (Sıralı) BuildZone Sistemi:**
   - NPC ve Bıçkıhane inşa alanları başlangıçta ekranda kalabalık etmez; ana binalar yapıldıkça ilgili otomasyon kareleri aşamalı olarak açılır.

5. **Üstel (Eksponansiyel) Bırakma / Boşaltma Hız Eğrisi:**
   - Eşya ve kaynak bırakma/boşaltma işlemleri üstel hızlandırma eğrisi (`targetInterval = Math.max(0.015, 0.11 * Math.pow(0.85, streak))`) ile anında serileşir.

6. **Açılan Yeni Bölgelerin Çitle Çevrilmesi:**
   - Her yeni orman açıldığında dış perimetre sınırları yeni çitlerle kapatılır.

7. **Doğrulama ve Derleme:**
   - `npm run build` komutu ile TypeScript ve Vite derleme kontrolleri 0 hata ile doğrulandı.

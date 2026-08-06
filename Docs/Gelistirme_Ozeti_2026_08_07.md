# Geliştirme Özeti - 07.08.2026

## Yapılan Güncellemeler ve İyileştirmeler (Tam Liste)

1. **Kütük Bırakma İstasyonu ve Yapı Şeffaflaşması (Occlusion):**
   - Karakter Kütük Bırakma İstasyonu'nun (veya Bıçkıhane / Tezgâhların) arkasına geçtiğinde, yapının çatısı ve gövdesi ağaçlarda olduğu gibi otomatik olarak %32 opaklığa şeffaflaşır. Karakter yapının arkasında kesinlikle kaybolmaz.

2. **Genişletilmiş Plot 0 Başlangıç Haritası & Hiyerarşik Hizalama:**
   - Başlangıç Plot 0 alanı genişletilerek (`X: [-32, -5]`, `Z: [-14, 14]`) tüm binalar ve otomasyon kareleri geniş, ferah ve çakışmasız iki paralel hatta oturtuldu:
     - **Kütük Hattı (Güney):** İstasyon (`-22`) -> Kütük Taşıyıcı (`-15.5`) -> Kütük Satıcısı (`-9.5`) -> Kütük Tezgâhı (`-5`).
     - **Tahta Hattı (Kuzey):** Bıçkıhane (`-22`) -> Tahta Taşıyıcı (`-15.5`) -> Tahta Satıcısı (`-9.5`) -> Tahta Tezgâhı (`-5`).

3. **Milimetrik Hizalı Doğu Yolu Çitleri:**
   - Doğu yol hattındaki tüm çitler tam olarak `X = -5.0` hizasında birleştirilerek tezgâh yanlarındaki kaymalar ve bozulmalar giderildi.

4. **Tezgâhların Karşısındaki Batı Ormanı Genişlemesi (Plot 3):**
   - Tezgâhların tam karşısındaki Batı duvarında (`X = -32, Z = 0`) genişleme inşa karesi eklendi. Satın alındığında arazi batı yönüne doğru `-56.0` koordinatına kadar genişler ve batı ormanı tamamen açılır.

5. **Aşamalı (Sıralı) BuildZone Sistemi:**
   - NPC ve Bıçkıhane inşa alanları başlangıçta ekranda kalabalık etmez; ana binalar yapıldıkça ilgili otomasyon kareleri aşamalı olarak açılır.

6. **Üstel (Eksponansiyel) Bırakma / Boşaltma Hız Eğrisi:**
   - Eşya ve kaynak bırakma/boşaltma işlemleri üstel hızlandırma eğrisi ile serileştirildi.

7. **Açılan Yeni Bölgelerin Çitle Çevrilmesi:**
   - Her yeni orman açıldığında dış perimetre sınırları yeni çitlerle kapatılır.

8. **Doğrulama ve Derleme:**
   - `npm run build` komutu ile TypeScript ve Vite derleme kontrolleri 0 hata ile doğrulandı.

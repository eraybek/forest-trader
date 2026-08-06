# Geliştirme Özeti - 07.08.2026

## Yapılan Güncellemeler ve İyileştirmeler (Tam Liste)

1. **Ayrı Tahta Tezgâhı (Plank Trading Counter):**
   - Bıçkıhane kurulduğunda doğu hattında (`Z = -4.5`) ikinci bir **Tahta Tezgâhı** (`plankTrader`) otomatik açılır.
   - Tahta isteyen alıcılar bu yeni tezgâhın önündeki özel sırada bekler. Kütük alıcıları ise Kütük Tezgâhında (`Z = 4.5`) bekler.

2. **Dolum Alanı Yönü:**
   - Yeşil dolum alanı, "32 💵" yazısının tam alt kenarından başlayarak dikey olarak doğrudan yazının üzerine doğru yükselecek şekilde hizalandı.

3. **Karakter Animasyonu:**
   - Sırtta yük taşınırken elleri öne uzatma (`holding-both`) animasyonu kaldırıldı. Karakter yük taşırken doğal yürüyüş (`walk`) ve duruş (`idle`) klibini kullanıyor.

4. **Ağaç Şeffaflığı (Occlusion) Düzeltmesi:**
   - Ağaç modellerine bağımsız materyal kopyası (`clone()`) atanarak oyuncunun arkasında olduğu ağaç haricindeki diğer tüm ağaçların transparanlaşması engellendi. Yalnızca kamerayı kapatan ağaç şeffaflaşmaktadır.

5. **Müşteri Yolu Çitlerinin Kaldırılması:**
   - Tezgâh önündeki alıcı sırası ve yol üzerindeki çitler tamamen kaldırıldı. Müşteriler çite takılmadan akıcı bir şekilde yürüyor.

6. **Kafa Üstü Balon Gösterimi:**
   - Sıradaki müşterilerin kafa üstündeki kütük balonu gizlendi. Yalnızca en önde tezgâhta işlem bekleyen (`slotIndex === 0`) 1. müşterinin kafasında miktar balonu görünüyor.

7. **Yapı ve İnşa Alanı Çakışmasızlığı:**
   - İstasyon (`-14, 9`), Bıçkıhane (`-14, -9`), Tezgâhtar (`-9.5, 0`), Orman Genişlemeleri (Kuzey: `-6, 6.5`, Güney: `-6, -6.5`, Batı: `-20.5, 0`) koordinatları birbirinden geniş mesafelerle ayrıldı. Ağaçların bu alanlara doğması engellendi.

8. **Bıçkıhane (Sawmill) Elle Kütük Bırakma & Tahta Toplama:**
   - Bıçkıhaneye kütükler oyuncu yaklaşınca elle bırakılır. Üretilen tahtalar çıkış yığınında birikir ve oyuncu tahtaları sırtına toplayıp Tahta Tezgâhında satabilir.

9. **Tezgâhtar (Clerk) NPC Konumu:**
   - İşe alınan çalışan NPC Kütük Tezgâhı yeşil dairesinin merkezinde konumlandırıldı.

10. **3. Orman Genişlemesi (Batı Ormanı):**
    - Batı yönüne 3. genişleme ormanı (`Plot 3`, `X = -42` sınırına kadar) eklendi ve satın alma karesi yerleştirildi.

11. **Doğrulama ve Derleme:**
    - `npm run build` komutu ile TypeScript tip denetimi ve Vite bundling sorunsuz doğrulandı (0 hata).

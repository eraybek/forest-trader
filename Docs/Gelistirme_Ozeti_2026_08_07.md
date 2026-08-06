# Geliştirme Özeti - 07.08.2026

## Yapılan Güncellemeler ve İyileştirmeler (Tam Liste)

1. **Dolum Alanı Yönü:**
   - Yeşil dolum alanı, "32 💵" yazısının tam alt kenarından başlayarak dikey olarak doğrudan yazının üzerine doğru yükselecek şekilde `label.rotation.z` ile hizalandı.

2. **Karakter Animasyonu:**
   - Sırtta yük taşınırken elleri öne uzatma (`holding-both`) animasyonu kaldırıldı. Karakter yük taşırken doğal yürüyüş (`walk`) ve duruş (`idle`) klibini kullanıyor.

3. **Ağaç Şeffaflığı (Occlusion) Düzeltmesi:**
   - Ağaç modellerine bireysel materyal kopyası (`clone()`) atanarak oyuncunun arkasında olduğu ağaç haricindeki diğer tüm ağaçların transparanlaşması engellendi. Yalnızca kamerayı kapatan ağaç şeffaflaşmaktadır.

4. **Müşteri Yolu Çitlerinin Kaldırılması:**
   - Tezgâh önündeki alıcı sırası ve yol üzerindeki çitler tamamen kaldırıldı. Müşteriler çite takılmadan akıcı bir şekilde yürüyor.

5. **Kafa Üstü Balon Gösterimi:**
   - Sıradaki müşterilerin kafa üstündeki kütük balonu gizlendi. Yalnızca en önde tezgâhta işlem bekleyen (`slotIndex === 0`) 1. müşterinin kafasında miktar balonu görünüyor. Öndeki müşteri ayrılınca sıradaki öne geçiyor ve balonu beliriyor.

6. **Yapı ve İnşa Alanı Çakışmasızlığı:**
   - İstasyon (`-14, 9`), Bıçkıhane (`-14, -9`), Tezgâhtar (`-9.5, 0`), Orman Genişlemeleri (Kuzey: `-6, 6.5`, Güney: `-6, -6.5`, Batı: `-20.5, 0`) koordinatları birbirinden geniş mesafelerle ayrıldı. Ağaçların bu alanlara doğması engellendi.

7. **Bıçkıhane (Sawmill) Elle Kütük Bırakma & Tahta Toplama:**
   - Bıçkıhane otomatik kütük çekmeyi bıraktı. Oyuncu Bıçkıhaneye yaklaşarak sırttaki kütükleri hazneye bırakır.
   - Bıçkıhane kütükleri işler, tahta yığını çıkış alanında birikir.
   - Oyuncu çıkış alanına yaklaşarak tahtaları sırtına toplar ve tezgâhta satabilir.

8. **Tezgâhtar (Clerk) NPC Konumu:**
   - İşe alınan çalışan NPC tam olarak yeşil satış halkasının merkezinde (`Vector3(COMPOUND_EAST - 1.5, 0, 0)`) konumlandırıldı.

9. **3. Orman Genişlemesi (Batı Ormanı):**
   - Batı yönüne 3. genişleme ormanı (`Plot 3`, `X = -42` sınırına kadar) eklenecek satın alma karesi yerleştirildi.

10. **Doğrulama ve Derleme:**
    - `npm run build` komutu ile TypeScript tip denetimi ve Vite bundling sorunsuz doğrulandı (0 hata).

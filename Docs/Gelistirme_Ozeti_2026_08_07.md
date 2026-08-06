# Geliştirme Özeti - 07.08.2026

## Yapılan Güncellemeler ve İyileştirmeler

1. **Ağaç Kütük Düşüş Miktarı ve Para Kazancı:**
   - Başlangıç (yakın) ormandaki ağaçlardan düşen kütük miktarı **3'ten 5'e** çıkarıldı.
   - Kütük başına elde edilen sabit gelir **25 paraya** yükseltilerek oyuncunun kazancı ciddi oranda artırıldı.
   - Tahta fiyatı **60 para** olarak belirlendi.

2. **Satın Alma ve İnşaat Maliyetlerinin Düşürülmesi:**
   - Kütük Bırakma İstasyonu maliyeti: 3 kütük → **1 kütük**
   - Bıçkıhane (Sawmill) maliyeti: 60 para → **15 para**
   - Tezgâhtar (Clerk) kiralama maliyeti: 150 para → **30 para**
   - Kuzey Ormanı (Plot 1) açma maliyeti: 120 para → **20 para**
   - Derin Orman (Plot 2) açma maliyeti: 320 para → **50 para**

3. **Müşteri Sırası ve Tezgâh Düzenlemesi:**
   - Müşteriler tezgâhın önünde yan yana yığılmak yerine doğu ekseninde (+X yönü) **tekli hat üzerinde arka arkaya** sıralanacak şekilde güncellendi.
   - Müşteriler sıradayken tezgâha (Batı / -X yönü) doğru bakıyor ve öndeki müşteri işlemini tamamlayıp ayrıldığında arkadakiler sırayla öne adım atıyor.

4. **İstek Balonu ve "Alıcı" Panelinin Kaldırılması:**
   - Müşteri başı üzerindeki 3D konuşma balonundaki karmaşık teklif oyları ve fiyatlar kaldırıldı; sadece kaç adet kütük/tahta istendiğini gösteren simge ve miktar (`🪵 ×5`) bırakıldı.
   - Ekrandaki "Alıcı" (`offers-button`) butonu ve Alıcılar penceresi tamamen kaldırıldı.

5. **Kendi Alanımızı Büyütme ve Satın Alma Alanı Konumlandırma:**
   - Oyuncunun hareket edebildiği batı sınırı (`COMPOUND_WEST`) `-19.5` seviyesinden `-25.0` seviyesine çekilerek ana alan genişletildi.
   - Çit çizgisinde/arkasında kalan alan açma kareleri (Build Zone), oyuncunun kendi yürüyebildiği iç alana (`Z = 6.8` ve `Z = -6.8`) çekildi.
   - **Satın Alma Dolum Animasyonu:** Yeşil dolum alanı soldan sağa çapraz yerine ekranda tam olarak **aşağıdan yukarıya** (dikey) dolacak şekilde 45 derece döndürülerek hizalandı.

6. **Doğrulama ve Derleme:**
   - `npm run build` komutu ile TypeScript tip ve syntax kontrolü başarıyla doğrulandı.

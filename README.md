# Forest Trader

Mobil için Three.js ile geliştirilen top-down arcade kaynak toplama prototipi.

## Çalıştırma

```bash
npm install
npm run dev
```

## Üretim derlemesi

```bash
npm run build
```

## Oyun döngüsü

1. Joystick veya WASD ile bir ağaca yaklaş; durduğunda karakter otomatik keser.
2. Düşen kütükleri yaklaşarak topla; sırt kapasiten dolana kadar istiflenir.
3. Üsteki tek kütük bırakma istasyonuna gir ve stoğa bırak.
4. Yoldan gelen alıcılar takas tezgâhının önünde sıraya girer ve teklif verir
   (*N kütük → G para*). Tezgâhın arkasındaki yeşil halkaya geçince stok yeten
   ilk alıcıya satış yapılır. Alıcılar sonsuza kadar beklemez.
5. Ağaç kesmek ve satış yapmak XP verir; her seviye 1 yetenek puanı kazandırır.
   Puanları **Yetenek** panelinden balta hasarı, balta hızı, sırt kapasitesi,
   yürüme hızı ve pazarlığa dağıt.

## Orman ekonomisi

Ağaçlar **yenilenmez**. Orman üsse olan uzaklığa göre üç kademeye ayrılır:

| Kademe | Uzaklık | Can | Kütük | Kütük değeri |
| --- | --- | --- | --- | --- |
| Yakın | < 18 | 3 | 3 | 2 |
| Orta | 18 – 30 | 6 | 4 | 4 |
| Derin | > 30 | 10 | 5 | 7 |

Yakın orman tükendikçe oyuncu derine inmek zorunda kalır; derin ağaç daha uzun
kesilir ama daha çok ve daha değerli kütük verir. Stok tek bir ortalama fiyat
taşır, alıcı teklifleri bu ortalamaya ve pazarlık yeteneğine göre hesaplanır.

## Prototip kontrolleri

- Mobil: Ekranın altındaki joystick
- Masaüstü test: WASD veya yön tuşları
- Saldırı, toplama, teslim ve inşa: Yakınlık tabanlı ve otomatik

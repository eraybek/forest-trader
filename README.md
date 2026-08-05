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

## İlk prototip döngüsü

1. Joystick veya WASD ile bir ağaca yaklaş.
2. Durduğunda karakter otomatik olarak ağaca vurmaya başlar.
3. Düşen odunları yaklaşarak topla; kapasite dolana kadar sırtta istiflenir.
4. Odun istasyonunun sarı alanına girerek odunları ortak stoğa bırak.
5. Sol taraftaki **Teklif** butonundan yeterli stoğu sat.
6. Gold ile geliştirme satın al veya kilitli inşa alanında bekleyerek yeni istasyon kur.

## Prototip kontrolleri

- Mobil: Ekranın altındaki joystick
- Masaüstü test: WASD veya yön tuşları
- Saldırı, toplama, teslim ve inşa: Yakınlık tabanlı ve otomatik

# KanaOke (カナオケ)

> 🌐 **Dil / Language:** **Türkçe** · [English](README.md)

Spotify'da çalan Japonca şarkıları öğrenme aracına dönüştüren bir web uygulaması. Çalan parçayı algılar, senkronize sözlerini ekrana getirir, romaji okumalarını gösterir ve istediğin satırı tek tıkla Türkçe çeviri, kelime ve kanji detaylarıyla analiz eder.

React + Vite + TypeScript ile yazılmıştır; analiz ve romaji üretimi için küçük bir Node proxy kullanır.

> **Durum:** kişisel, ticari olmayan bir **portföy projesi**. Bir ürün değildir ve gelir amacı gütmez — yetenekleri sergilemek ve insanların Japonca çalışmasına yardımcı olmak için yapılmıştır. Spotify entegrasyonu Geliştirme Modu'nda çalışır, ücretli özellik veya reklam yoktur ve şarkı sözleri sahiplerine aittir. Bkz. [Lisans](#lisans) ve [DISCLAIMER.md](DISCLAIMER.md).

## Ne yapar?

- 🎵 **Çalan şarkıyı algılar** — Spotify'a giriş yap, çalan parça ve süresi anlık olarak takip edilir.
- ▶️ **Oynatmayı kontrol et** — uygulamadan oynat/duraklat, sonraki/önceki ve süre çubuğunda atlama (Spotify Premium ile).
- 📝 **Senkronize sözler ve karaoke** — LRCLIB'den çekilen sözlerde aktif satır vurgulanarak takip edilir. Söz yoksa veya yanlışsa kendi sözlerini yapıştırabilirsin.
- 🔤 **Romaji okumaları** — şarkı bilgisi ve Japonca satırlar için Latin harfli okunuş otomatik gösterilir.
- 🧠 **Satır analizi** — bir satıra tıkla; bağlama uygun doğal bir Türkçe çeviri, her kelimenin anlamı ve kanji detayları (onyomi, kunyomi, radikal, açıklama) gelir.
- ⚡ **Hızlı tekrar** — çekilen sözler ve yapılan analizler tarayıcıda saklanır; aynı satır bir daha anında açılır.

## Ekran görüntüleri

Masaüstü — solda senkronize karaoke sözleri, sağda çeviri, kelime anlamları ve kanji detaylarıyla satır analizi:

![Masaüstü — senkronize sözler ve satır analizi](docs/screenshots/desktop.png)

| Karaoke görünümü | Satır analizi (kanji detayları) |
|---|---|
| ![Karaoke görünümü — aktif satır vurgulu](docs/screenshots/karaoke.png) | ![Satır analizi — çeviri, kelimeler, kanji](docs/screenshots/analysis.png) |

Mobil — oynatıcı ekranın altına sabitlenir:

<img src="docs/screenshots/mobile.png" width="360" alt="Mobil — alta sabitlenmiş oynatıcı" />

## Kurulum

Gerekenler: Node.js, bir Spotify hesabı (oynatma kontrolleri için Premium) ve GitHub Models erişimi olan bir kişisel erişim anahtarı (PAT).

1. **Spotify uygulaması oluştur.** https://developer.spotify.com/dashboard adresinden bir uygulama aç ve Redirect URI olarak `http://127.0.0.1:5173/callback` ekle.

2. **`.env` dosyasını hazırla.** Kök dizindeki `.env.example` dosyasını `.env` olarak kopyala ve değerleri doldur — en önemlileri Spotify Client ID ve `GITHUB_MODELS_TOKEN`. Tüm değişkenlerin açıklaması için [docs/CONFIGURATION.tr.md](docs/CONFIGURATION.tr.md).

3. **Bağımlılıkları kur ve çalıştır.**
   ```bash
   npm install
   npm run proxy   # ayrı bir terminalde — analiz + romaji sunucusu
   npm run dev     # Vite geliştirme sunucusu
   ```

4. **Tarayıcıda aç.** Vite'in verdiği adrese git ve Spotify ile giriş yap.

## Nasıl kullanılır?

1. Spotify ile giriş yap; bilgisayarında veya telefonunda Spotify'da bir Japonca şarkı çal.
2. Çalan parça ve senkronize sözleri ekranda belirir; aktif satır karaoke gibi vurgulanır.
3. Anlamını öğrenmek istediğin satıra tıkla — sağ panelde çeviri, kelimeler ve kanji detayları açılır.
4. Söz bulunamazsa veya hatalıysa "manuel söz" alanına kendi sözlerini yapıştır.

> İpucu: Masaüstünde üstteki "şu an çalan" paneli küçültülerek sözlere daha fazla yer açılabilir; mobilde oynatıcı ekranın altına sabitlenir.

## Geliştirme

```bash
npm run proxy     # analiz + romaji proxy
npm run dev       # geliştirme sunucusu
npm run lint      # ESLint
npm run build     # üretim derlemesi
npm run preview   # derlemeyi önizle
```

## Daha fazlası

- **Yapılandırma, ortam değişkenleri, Codespaces ve proxy ayrıntıları:** [docs/CONFIGURATION.tr.md](docs/CONFIGURATION.tr.md)

## Teknolojiler

React 19 · Vite · TypeScript · Tailwind CSS · Spotify Web API (OAuth 2.0 PKCE) · LRCLIB · GitHub Models · kuroshiro + kuromoji (romaji)

## Lisans

**Tescilli — tüm hakları saklıdır.** Bu yazılım **açık kaynak değildir.** Kaynak
kod yalnızca tanıtım ve portföy incelemesi amacıyla herkese açık yayımlanmıştır;
önceden yazılı izin olmadan yeniden kullanma, değiştirme, dağıtma veya bir hizmet
olarak çalıştırma izni verilmez. Bkz. [LICENSE](LICENSE).

Bu, yalnızca projenin kendi koduna uygulanır. Üçüncü taraf kütüphaneler kendi
lisanslarını korur ve şarkı sözleri ilgili hak sahiplerine aittir — bu proje
tarafından sahiplenilmez veya lisanslanmaz.

## Hukuki bilgi & atıf

KanaOke bağımsız, ticari olmayan bir projedir ve Spotify, GitHub, LRCLIB ya da
herhangi bir sanatçı veya yapımcı ile **bağlantılı değildir, onlar tarafından
onaylanmamıştır.** Tüm ticari markalar sahiplerine aittir. Şarkı sözleri ilgili
hak sahiplerine aittir; uygulama bunları kişisel çalışma için gösterir ve sunucu
tarafında saklamaz veya yeniden dağıtmaz. Tam metin için — Spotify kullanımı, söz
telif hakları, kapsam ve kaldırma talebi iletişimi — bkz. [DISCLAIMER.md](DISCLAIMER.md).

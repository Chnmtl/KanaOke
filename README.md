# JaponcaEgitim

Spotify'da çalan şarkıyı algılayan, LRCLIB'den senkronize sözleri çeken ve Japonca satırları GitHub Models API ile analiz eden React + Vite + TypeScript uygulaması.

## Özellikler

- Spotify OAuth 2.0 PKCE ile tarayıcı tabanlı giriş
- Her saniye güncellenen "şu an çalan" şarkı bilgisi
- LRCLIB üzerinden senkronize LRC sözleri ve karaoke vurgusu
- GitHub Models API ile romaji, Türkçe çeviri, kelime ve kanji analizi
- Tailwind CSS ile koyu tema, iki kolonlu arayüz

## Kurulum

1. **Spotify Developer Dashboard**
   - https://developer.spotify.com/dashboard adresinden uygulama oluştur.
   - Redirect URI olarak yerelde `http://127.0.0.1:5173/callback` ekle.
   - Codespaces kullanıyorsan ayrıca `https://<codespace-adı>-5173.app.github.dev/callback` biçimindeki URI'yi de ekle.

2. **GitHub Models için backend proxy hazırla (önerilen)**
   - GitHub Models API anahtarını istemciye koyma.
   - Token'ı yalnızca sunucu tarafında tutan bir endpoint kullan (ör. `/api/analyze`).
   - Bu repo artık yerel geliştirme için `npm run proxy` komutuyla çalışan küçük bir Node proxy içerir.

3. **`.env` dosyasını ayarla**
   - Kök dizinde `.env.example` dosyasını `.env` olarak kopyala ve değerleri doldur.
   - `VITE_ANALYSIS_API_URL` değerini backend endpoint'ine yönlendir.
   - `VITE_ALLOW_INSECURE_CLIENT_TOKEN` değerini `false` bırak.
   - `GITHUB_MODELS_TOKEN` değerine PAT ekle. `VITE_` öneki kullanma.

4. **Bağımlılıkları kur ve çalıştır**
   ```bash
   npm install
   npm run proxy
   npm run dev
   ```

5. **Uygulamayı aç**
   - Tarayıcıda Vite adresine git.
   - Spotify ile giriş yap.
   - Çalan Japonca şarkının senkronize satırlarını inceleyip analiz için satıra tıkla.

## Geliştirme Komutları

```bash
npm run proxy
npm run dev
npm run lint
npm run build
```

## Codespaces Notları

- Public port 5173 adresini aç ve oluşan URL'nin sonuna `/callback` ekleyerek Spotify Redirect URI olarak kaydet.
- `VITE_SPOTIFY_REDIRECT_URI` değerini bu callback adresiyle eşleştir.
- GitHub token'ını istemci `.env` dosyasına koyma; backend tarafında Codespaces secret olarak kullan.
- Sadece geçici test için `VITE_ALLOW_INSECURE_CLIENT_TOKEN=true` ve `VITE_GITHUB_TOKEN` kullanımı mümkündür (üretimde önerilmez).

## Yerel Analiz Proxy'si

- Proxy `http://127.0.0.1:8787/api/analyze` adresinde çalışır.
- Varsayılan portu değiştirmek için `ANALYSIS_PROXY_PORT` kullan.
- Proxy `GITHUB_MODELS_TOKEN` değerini `process.env`, `.env.local` veya `.env` içinden okur.
- Sağlık kontrolü için `http://127.0.0.1:8787/health` adresini açabilirsin.

### Romaji Okumaları

- Romaji, aynı proxy üzerinde `http://127.0.0.1:8787/api/romaji` adresinden üretilir.
- Kuroshiro + kuromoji, sözlüğü doğrudan `node_modules/kuromoji/dict` içinden okuyarak **Node tarafında** çalışır; tarayıcıya sözlük indirilmez ve herhangi bir shim/polyfill gerekmez.
- `POST` gövdesi `{ "texts": ["東京", ...] }` (veya tek metin için `{ "text": "..." }`) alır, `{ "romaji": ["tōkyō", ...] }` döner. Japonca olmayan metinler için boş dize döner.
- İstemci tarafında endpoint'i `VITE_ROMAJI_API_URL` ile ayarla. Tanımlı değilse romaji gösterilmez (uygulama yine çalışır).
- Şarkı adı/sanatçı/albüm ve tüm Japonca söz satırları için romaji otomatik gösterilir; sonuçlar tarayıcıda önbelleğe alınır.

### Debug Logları

- Tarayıcı tarafında analiz çağrısı loglarını görmek için `VITE_ANALYSIS_DEBUG=true` ayarla.
- Proxy tarafında model, süre ve durum loglarını görmek için `ANALYSIS_PROXY_DEBUG=true` ayarla.
- Debug logları hiçbir zaman token değerini yazdırmaz.

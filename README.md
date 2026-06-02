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
   - Redirect URI olarak yerelde `http://localhost:5173/callback` ekle.
   - Codespaces kullanıyorsan ayrıca `https://<codespace-adı>-5173.app.github.dev/callback` biçimindeki URI'yi de ekle.

2. **GitHub Models için backend proxy hazırla (önerilen)**
   - GitHub Models API anahtarını istemciye koyma.
   - Token'ı yalnızca sunucu tarafında tutan bir endpoint kullan (ör. `/api/analyze`).

3. **`.env` dosyasını ayarla**
   - Kök dizinde `.env.example` dosyasını `.env` olarak kopyala ve Spotify değerlerini doldur.
   - `VITE_ANALYSIS_API_URL` değerini backend endpoint'ine yönlendir.
   - Sadece geçici istemci testi için `VITE_ALLOW_INSECURE_CLIENT_TOKEN=true` ve isteğe bağlı `VITE_GITHUB_TOKEN` kullan.

4. **Bağımlılıkları kur ve çalıştır**
   ```bash
   npm install
   npm run dev
   ```

5. **Uygulamayı aç**
   - Tarayıcıda Vite adresine git.
   - Spotify ile giriş yap.
   - Çalan Japonca şarkının senkronize satırlarını inceleyip analiz için satıra tıkla.

## Geliştirme Komutları

```bash
npm run dev
npm run lint
npm run build
```

## Codespaces Notları

- Public port 5173 adresini aç ve oluşan URL'nin sonuna `/callback` ekleyerek Spotify Redirect URI olarak kaydet.
- `VITE_SPOTIFY_REDIRECT_URI` değerini bu callback adresiyle eşleştir.
- GitHub token'ını istemci `.env` dosyasına koyma; backend tarafında Codespaces secret olarak kullan.
- Backend proxy yoksa uygulama açıldıktan sonra GitHub Models token değerini arayüzdeki gizli alana girerek yalnızca oturum boyunca kullanabilirsin.
- `.env` içindeki `VITE_GITHUB_TOKEN` değeri sadece geçici istemci testi için ve `VITE_ALLOW_INSECURE_CLIENT_TOKEN=true` ile birlikte kullanılmalıdır.

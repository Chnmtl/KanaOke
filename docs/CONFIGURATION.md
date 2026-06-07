# Yapılandırma ve Ayrıntılar

Bu belge, JaponcaEgitim uygulamasının yapılandırması, ortam değişkenleri, mimarisi ve proxy ayrıntılarını içerir. Genel tanıtım ve hızlı kurulum için ana [README](../README.md) dosyasına bak.

## Mimari

- **İstemci (Vite/React):** Spotify kimlik doğrulaması ve "şu an çalan" yoklaması, LRCLIB sorgusu ve aday seçimi, arayüz ve tarayıcı önbelleği.
- **Yerel proxy (`proxy/server.mjs`, Node):** GitHub Models token'ını yalnızca sunucuda tutar ve üç endpoint sunar:
  - `POST /api/analyze` — satır analizi (GitHub Models çağrısı + deterministik romaji üzerine yazma).
  - `POST /api/romaji` — kuroshiro + kuromoji ile romaji üretimi.
  - `GET /health` — durum kontrolü (`{ ok, model, tokenConfigured }`).

### Neden ayrı bir proxy?

- **Token güvenliği:** GitHub Models PAT'i istemciye gömülmez; yalnızca sunucu tarafında tutulur.
- **Romaji okumaları:** Söz satırlarında varsayılan olarak kuroshiro + kuromoji'nin sözlük tabanlı okunuşu gösterilir. Bir satır analiz edilirken bu kuromoji okunuşu modele referans olarak gönderilir; model bunu doğrular ve şarkıda alışılmadık/özel bir okunuş (ör. furigana) varsa düzeltir. Analizdeki nihai romaji modele aittir; model bir alanı boş bırakırsa o alan kuromoji okunuşuyla doldurulur (yedek).
- **Sözlük doğrudan dosya sisteminden** (`node_modules/kuromoji/dict`) okunur; tarayıcıya sözlük indirilmez, herhangi bir shim/polyfill gerekmez. Kuroshiro/kuromoji bir kez tembel (lazy) başlatılır ve yeniden kullanılır.

## Ortam Değişkenleri

Kök dizindeki `.env.example` dosyasını `.env` olarak kopyalayıp doldur.

| Değişken | Taraf | Açıklama |
| --- | --- | --- |
| `VITE_SPOTIFY_CLIENT_ID` | İstemci | Spotify uygulamasının Client ID değeri. |
| `VITE_SPOTIFY_REDIRECT_URI` | İstemci | Spotify Redirect URI (callback adresi). |
| `VITE_ANALYSIS_API_URL` | İstemci | Analiz proxy endpoint'i (`.../api/analyze`). |
| `VITE_ROMAJI_API_URL` | İstemci | Romaji proxy endpoint'i (`.../api/romaji`). Tanımlı değilse romaji gösterilmez (uygulama yine çalışır). |
| `VITE_GITHUB_MODEL` | Her ikisi | Kullanılacak model (varsayılan `gpt-4.1-mini`). |
| `VITE_ALLOW_INSECURE_CLIENT_TOKEN` | İstemci | Üretimde `false`. Yalnızca geçici test için `true` yapılabilir. |
| `VITE_GITHUB_TOKEN` | İstemci | Yalnızca insecure modda (yukarıdaki `true` iken) kullanılır; üretimde boş bırak. |
| `GITHUB_MODELS_TOKEN` | Sunucu | Proxy'nin GitHub Models PAT'i. `GITHUB_TOKEN` da yedek olarak okunur. |
| `ANALYSIS_PROXY_PORT` | Sunucu | Proxy portu (varsayılan `8787`). |
| `VITE_ANALYSIS_DEBUG` | İstemci | `true` ise tarayıcıda analiz çağrısı logları. |
| `ANALYSIS_PROXY_DEBUG` | Sunucu | `true` ise proxy'de model/süre/durum logları. |

> Debug logları hiçbir zaman token değerini yazdırmaz.

### İstemcide PAT kullanımı (önerilmez)

Varsayılan ve önerilen yol, analiz isteklerini proxy üzerinden geçirmektir (`VITE_ANALYSIS_API_URL`). Yalnızca geçici yerel test için proxy olmadan, doğrudan istemciden GitHub Models'a istek atmak mümkündür; bunun için `VITE_ALLOW_INSECURE_CLIENT_TOKEN=true` ve `VITE_GITHUB_TOKEN` tanımlanmalıdır. Token tarayıcıya gömüleceği için üretimde kullanma.

## Proxy Detayları

- **Analiz:** `POST http://127.0.0.1:8787/api/analyze` — gövde `{ line, model?, context? }`, yanıt `{ result }`.
- **Romaji:** `POST http://127.0.0.1:8787/api/romaji` — gövde `{ "texts": ["東京", ...] }` veya tek metin için `{ "text": "..." }`, yanıt `{ "romaji": ["tōkyō", ...] }`. Japonca olmayan metinler için boş dize döner.
- **Sağlık:** `GET http://127.0.0.1:8787/health`.
- Proxy `GITHUB_MODELS_TOKEN` değerini `process.env`, `.env` veya `.env.local` içinden okur.
- Varsayılan portu değiştirmek için `ANALYSIS_PROXY_PORT` kullan.

## Sözler ve Önbellek

- **LRCLIB aday seçimi:** Birden fazla aday dönerse en uygunu; isim, sanatçı, albüm, süre yakınlığı ve Japonca içerik oranına göre puanlanarak seçilir. Senkronize kayıt yoksa düz (plain) söze düşülür.
- **Söz önbelleği:** localStorage, ~30 gün. Manuel girilen sözler de parçayla birlikte saklanır.
- **Analiz önbelleği:** localStorage, ~14 gün. Analiz panelinde sonucun kayıttan mı yoksa az önce mi üretildiği bir rozetle gösterilir; daha önce analiz edilmiş satırlar söz listesinde işaretlenir.

## Oynatma Kontrolleri

- Oynat/duraklat, sonraki, önceki ve süre çubuğunda atlama (seek) desteklenir; komutlar anlık geri bildirim için iyimser (optimistic) güncellenir ve sonraki yoklamada gerçek durumla eşitlenir.
- Bu kontroller **Spotify Premium** gerektirir ve `user-modify-playback-state` izniyle çalışır; aktif bir Spotify cihazı (açık bir uygulama) bulunmalıdır. Aksi halde "aktif cihaz yok" veya "izin reddedildi" uyarısı gösterilir.

## Codespaces Notları

- Public port 5173'ü aç ve oluşan URL'nin sonuna `/callback` ekleyerek Spotify Redirect URI olarak kaydet.
- `VITE_SPOTIFY_REDIRECT_URI` değerini bu callback adresiyle eşleştir.
- GitHub token'ını istemci `.env` dosyasına koyma; `GITHUB_MODELS_TOKEN` değerini sunucu tarafında Codespaces secret olarak kullan.
- Sadece geçici test için `VITE_ALLOW_INSECURE_CLIENT_TOKEN=true` ve `VITE_GITHUB_TOKEN` kullanımı mümkündür (üretimde önerilmez).

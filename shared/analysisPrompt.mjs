// Single source of truth for the line-analysis prompt, shared by both the
// browser-direct path (src/api/githubModels.ts) and the Node proxy
// (proxy/server.mjs). Pure string-building — no env, no Node/DOM APIs — so it
// imports cleanly into both the Vite bundle and the standalone proxy.
//
// Context fields are read defensively (the proxy receives an untyped request
// body), so missing lineIndex / surroundingLines degrade gracefully.

export const promptForLine = (line, context, lineRomaji) => {
  const ctx = context ?? {}
  const surrounding = Array.isArray(ctx.surroundingLines) ? ctx.surroundingLines : []

  return `Sen deneyimli bir Japonca şarkı sözü öğretmenisin. Aşağıdaki satırı, şarkının bağlamını dikkate alarak analiz et.

Öncelikler:
- Birebir değil, doğal ve akıcı bir Türkçe çeviri ver; satırın gerçek anlamını aktar.
- Kelime oyunu, deyim, mecaz, çift anlam veya kültürel gönderme varsa "turkce" alanında kısaca açıkla.
- Şarkı adı, sanatçı ve çevredeki satırları bağlam olarak kullan; özne/zamir belirsizse bağlamdan çıkar.
- Satırın sözlük tabanlı (kuromoji) okunuşu aşağıda "Okunuş (romaji)" olarak referans verilmiştir. Bu okunuşu doğrula: şarkıda alışılmadık/özel bir okunuş (ör. furigana) kullanılıyorsa düzelt, doğruysa olduğu gibi kullan. Satırın "romaji" alanını ve her kelimenin "romaji" alanını doğru Hepburn romaji ile doldur.
- Her önemli kelime için anlam ver. Kanji içeren kelimelerde kanji detaylarını (onyomi, kunyomi, radikal, kısa açıklama) doldur.
- Japonca olmayan satırlarda "turkce" alanında önce orijinal metni aynen koru, hemen ardından parantez içinde Türkçe çevirisini ver (örn: I love you (Seni seviyorum)); "kelimeler" alanını boş dizi olarak döndür.
- Japonca bir satırın İÇİNDE Japonca olmayan (ör. İngilizce) kelime/ifade geçiyorsa: "turkce" alanında o kelimeyi/ifadeyi ÇEVİRME, kaynaktaki haliyle AYNEN bırak ve parantez EKLEME; bunun yerine her biri için "yabanci" dizisine {"metin": "<kaynaktaki birebir metin>", "anlam": "<Türkçe karşılığı>"} ekle. Parantezli karşılığı uygulama otomatik ekler (örn: "そう Its a deal 迷わずね" → turkce: "Evet, Its a deal, tereddüt etmeden", yabanci: [{"metin": "Its a deal", "anlam": "anlaştık"}]). Japonca olmayan kelime yoksa "yabanci" alanını boş dizi döndür.
- Her durumda yalnızca geçerli JSON döndür.

Satır: "${line}"
Okunuş (romaji): ${lineRomaji || 'Yok'}

Şarkı adı: ${ctx.trackName ?? 'Bilinmiyor'}
Sanatçı: ${ctx.artistName ?? 'Bilinmiyor'}
Satır sırası: ${(ctx.lineIndex ?? 0) + 1}

Çevredeki satırlar:
${surrounding.length > 0 ? surrounding.map((item, index) => `${index + 1}. ${item}`).join('\n') : 'Yok'}

Şu formatta JSON döndür:
{
  "romaji": "...",
  "turkce": "...",
  "yabanci": [
    {
      "metin": "...",
      "anlam": "..."
    }
  ],
  "kelimeler": [
    {
      "japonca": "...",
      "romaji": "...",
      "anlam": "...",
      "kanji": {
        "karakter": "...",
        "onyomi": "...",
        "kunyomi": "...",
        "radikal": "...",
        "aciklama": "..."
      }
    }
  ]
}`
}

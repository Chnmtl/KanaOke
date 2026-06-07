---
name: localization-scope
description: What "localization" means for KanaOke — UI language only, not the analysis/translation target
metadata:
  type: project
---

KanaOke's localization work is **UI-language only**. The Japanese→Turkish line translation and word/kanji analysis is intentionally Turkish-only and must NOT be made language-aware — leave the prompts in `proxy/server.mjs` and `src/api/githubModels.ts` untouched.

**Why:** The product targets Turkish speakers learning Japanese; the analysis output language is a fixed product decision, separate from the interface chrome.

**How to apply:** When the user says "translation"/"localization", they mean the UI strings (buttons, labels, tooltips), handled via react-i18next (`src/i18n/`, catalogs `en.json`/`tr.json`). UI ships English (default) + Turkish, with Japanese planned later. Don't touch the analysis prompt language.

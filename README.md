# PriceOn landing site — priceon.tech

Push to `main` → Netlify runs `python3 build.py` → publishes `dist/` (see netlify.toml).

## How it works (auto-update for every language)
- `template.html` — the single page layout (all languages share it)
- `i18n/en.json` — English copy = **source of truth**
- `i18n/<lang>.json` — tr, ar, hi, id, ms, ja, ko, zh-Hant, ru, uz, sw
- Change layout or English → every language rebuilds automatically.
- New English text not yet translated → that language shows English for that line (never breaks). The build log lists missing keys.
- Visitors on `/` are routed by browser language (Netlify `_redirects`); the language menu remembers the choice (`nf_lang` cookie).

## Settings (site.js → `PO`)
- `communityUrl` — official Telegram community link (until set, buttons open the bot)
- `whatsappUrl` — `https://wa.me/<number>` (until set, WhatsApp button shows "coming soon")
- `termsUrl`, `privacyUrl`, `xUrl`

Old root `index.html` / `tr/` / `sitemap.xml` are unused legacy files (the build outputs to `dist/`).

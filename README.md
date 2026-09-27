# PriceOn landing site

Static site (no build step). Push to `main` → Netlify auto-deploys to https://priceon.tech

- `index.html` — English, `tr/index.html` — Turkish
- `site.js` — UTM capture, Telegram deep links (`startapp` payload), dataLayer events. Config at top (`PO`).
- `style.css` — shared styles
- `img/` — real app screenshots (webp), logo, OG image
- Tracking plan: see the "Telegram Bot" Claude project doc `claude/priceon-website-tracking-plan.md`

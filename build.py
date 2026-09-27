#!/usr/bin/env python3
"""PriceOn site builder.

One template (template.html) + one strings file per language (i18n/<code>.json).
English (i18n/en.json) is the source of truth: any key missing in another
language falls back to English, so the site never breaks when new copy is added.

Netlify runs this on every push (see netlify.toml) and publishes ./dist.
Run locally:  python3 build.py
"""
import json, os, re, shutil, html, hashlib

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, "dist")
SITE = "https://priceon.tech"

# code -> (url path, og locale). Order = order in the language menu.
LANGS = {
    "en": ("/", "en_US"),
    "tr": ("/tr/", "tr_TR"),
    "ar": ("/ar/", "ar_AE"),
    "hi": ("/hi/", "hi_IN"),
    "id": ("/id/", "id_ID"),
    "ms": ("/ms/", "ms_MY"),
    "ja": ("/ja/", "ja_JP"),
    "ko": ("/ko/", "ko_KR"),
    "zh-Hant": ("/zh/", "zh_TW"),
    "ru": ("/ru/", "ru_RU"),
    "uz": ("/uz/", "uz_UZ"),
    "sw": ("/sw/", "sw_TZ"),
}
FAQ = ["what", "round", "length", "assets", "start", "telegram", "demo", "live",
       "depwhere", "fees", "referral", "refpay", "refdemo", "advice", "risk"]

TG = ('<svg class="tg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 13l-4.8-1.5c-1-.3-1-1 .2-1.5L20.5 2.8c.9-.3 1.6.2 1.4 1.5z"/></svg>')
TG_PLAIN = TG.replace(' class="tg"', "")
WA = ('<svg class="wa" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>')

def strip(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s))

def load(code):
    with open(os.path.join(ROOT, "i18n", code + ".json"), encoding="utf-8") as f:
        return json.load(f)

def main():
    tpl = open(os.path.join(ROOT, "template.html"), encoding="utf-8").read()
    en = load("en")
    available = [c for c in LANGS if os.path.exists(os.path.join(ROOT, "i18n", c + ".json"))]
    if os.path.exists(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)

    alternates = "\n".join(
        f'<link rel="alternate" hreflang="{c}" href="{SITE}{LANGS[c][0]}">' for c in available
    ) + f'\n<link rel="alternate" hreflang="x-default" href="{SITE}/">'

    # cache-busting: asset URLs change whenever css/js content changes
    ver = hashlib.md5(b"".join(open(os.path.join(ROOT, f), "rb").read() for f in ["style.css", "site.js"])).hexdigest()[:8]

    report = {}
    for code in available:
        t = dict(en)
        own = load(code)
        missing = [k for k in en if k not in own]
        t.update(own)
        report[code] = missing
        path, locale = LANGS[code]
        depth = path.strip("/").count("/") + (1 if path.strip("/") else 0)
        base = "../" * depth
        opts = "".join(
            f'<option value="{LANGS[c][0]}" data-code="{c}"{" selected" if c == code else ""}>'
            f'{html.escape(load(c).get("lang_name", c))}</option>' for c in available
        )
        faq_html = "\n      ".join(
            f'<details data-q="{q}"><summary>{t["faq_"+q+"_q"]}</summary><p>{t["faq_"+q+"_a"]}</p></details>'
            for q in FAQ
        )
        ld = {"@context": "https://schema.org", "@graph": [
            {"@type": "SoftwareApplication", "name": "PriceOn", "applicationCategory": "GameApplication",
             "operatingSystem": "Telegram", "url": SITE + path, "inLanguage": code, "description": strip(t["ld_desc"])},
            {"@type": "FAQPage", "inLanguage": code, "mainEntity": [
                {"@type": "Question", "name": strip(t["faq_" + q + "_q"]),
                 "acceptedAnswer": {"@type": "Answer", "text": strip(t["faq_" + q + "_a"])}} for q in FAQ]}]}
        ctx = dict(t)
        ctx.update({
            "lang": code, "dir": t.get("dir", "ltr"), "base": base, "home": path,
            "canonical": SITE + path, "alternates": alternates, "og_locale": locale,
            "lang_options": opts, "faq_html": faq_html,
            "ld_json": json.dumps(ld, ensure_ascii=False).replace("</", "<\\/"),
            "ver": ver, "tg_icon": TG, "tg_icon_plain": TG_PLAIN, "wa_icon": WA,
        })
        out = re.sub(r"\{\{(\w[\w-]*)\}\}", lambda m: ctx.get(m.group(1), m.group(0)), tpl)
        left = re.findall(r"\{\{[\w-]+\}\}", out)
        if left:
            raise SystemExit(f"[{code}] unfilled placeholders: {sorted(set(left))}")
        d = os.path.join(DIST, path.strip("/"))
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(out)

    # static assets
    for f in ["style.css", "site.js", "robots.txt", "_headers"]:
        if os.path.exists(os.path.join(ROOT, f)):
            shutil.copy(os.path.join(ROOT, f), DIST)
    shutil.copytree(os.path.join(ROOT, "img"), os.path.join(DIST, "img"))

    # sitemap with hreflang alternates
    links = "".join(f'\n    <xhtml:link rel="alternate" hreflang="{c}" href="{SITE}{LANGS[c][0]}"/>' for c in available)
    urls = "".join(f"\n  <url>\n    <loc>{SITE}{LANGS[c][0]}</loc>{links}\n  </url>" for c in available)
    open(os.path.join(DIST, "sitemap.xml"), "w", encoding="utf-8").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:xhtml="http://www.w3.org/1999/xhtml">' + urls + "\n</urlset>\n")

    # auto-route the home page by browser language (nf_lang cookie = user's own choice wins)
    rules = []
    for c in available:
        if c == "en":
            continue
        lang_code = "zh" if c == "zh-Hant" else c
        rules.append(f"/  {LANGS[c][0]}  302!  Language={lang_code}")
    open(os.path.join(DIST, "_redirects"), "w").write("\n".join(rules) + "\n")

    for c, miss in report.items():
        print(f"{c:8} {'OK' if not miss else 'missing ' + str(len(miss)) + ' → English fallback: ' + ', '.join(miss[:6])}")
    print(f"Built {len(available)} languages into dist/")

if __name__ == "__main__":
    main()

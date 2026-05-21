# Numerastra — Frontend Site

Multi-page static site for the Numerastra numerology platform. **45 pages, ~560KB unpacked.**

## Structure

```
numerastra-web/
├── index.html                        ← Landing + multi-step calculator
├── sitemap.xml                       ← All 45 URLs for search engines
├── robots.txt                        ← Search engine directives
├── assets/
│   ├── css/main.css                  ← Shared design system (indigo + gold + ivory)
│   └── js/engine.js                  ← Shared numerology engine → window.Numerastra
├── pages/
│   ├── results.html                  ← Full 11-tool reading (8 tabs)
│   ├── pricing.html                  ← Plans + comparison + FAQ
│   ├── faq.html                      ← 20+ questions with FAQPage schema
│   ├── about.html                    ← Story, philosophy
│   ├── contact.html                  ← Support / feedback / partnerships
│   ├── login.html                    ← OTP flow UI
│   ├── privacy.html                  ← Privacy policy
│   ├── terms.html                    ← Terms of service
│   ├── glossary.html                 ← A-Z numerology terms
│   ├── compatibility.html            ← Two-person compatibility calculator
│   ├── auspicious.html               ← Event-aware date finder
│   ├── numerology.html               ← Life-path hub
│   ├── angel-numbers.html            ← Angel-numbers hub
│   └── blog.html                     ← Blog index
├── numerology/
│   └── 1.html–9.html, 11.html, 22.html, 33.html   ← 12 dedicated pages
├── angel-numbers/
│   └── 111, 222, 333, 444, 555, 666, 777, 888, 999, 1111, 1212, 1234
└── blog/
    ├── life-path-number-guide.html   ← Pillar article (22KB)
    ├── master-numbers-guide.html
    ├── angel-number-111-meaning.html
    ├── moolank-bhagyank-namank.html
    ├── name-correction-guide.html
    └── personal-year-2026.html
```

## Deployment

The site is pure static HTML/CSS/JS — no build step, no framework. Upload the contents of `numerastra-web/` to any static host (Hostinger public_html, S3, Netlify, Cloudflare Pages, GitHub Pages).

### For Hostinger Business plan (recommended)
1. Upload the contents of `numerastra-web/` to `public_html/`
2. Point your API subdomain (`api.numerastra.com`) at your Node.js backend — see `numerology-api/DEPLOY.md`
3. Set up SSL via Let's Encrypt in hPanel
4. Submit sitemap.xml to Google Search Console: https://search.google.com/search-console

### Backend integration
The site calls `https://api.numerastra.com` for paid features (login, AI, payments). For the frontend to talk to the backend:

1. Backend CORS must whitelist `https://numerastra.com` (already configured in `numerology-api/server.js`)
2. Frontend calls expect these endpoints (see `numerology-api/src/routes/`):
   - `POST /api/auth/otp/send` — OTP send
   - `POST /api/auth/otp/verify` — OTP verify
   - `POST /api/calculate` — full calculation
   - `POST /api/ai/ask` — AI guidance (auth + free-question gate)
   - `POST /api/razorpay/order` — Razorpay checkout
   - `POST /api/stripe/checkout` — Stripe checkout

The static engine.js handles free tier calculations entirely client-side — no API call needed for the landing calculator or the results page. The API is only called for paid features and auth.

## Design tokens

Defined in `assets/css/main.css`:

| Token | Value |
|---|---|
| `--indigo` | `#0B0D17` (primary background) |
| `--indigo-2` | `#141826` (card surface) |
| `--ivory` | `#E8E4DC` (body text) |
| `--gold` | `#C9A55A` (accent, CTAs) |
| `--gold-bright` | `#E4C07F` (hover state) |
| `--serif` | Crimson Text (headings) |
| `--sans` | DM Sans (body) |

Compatibility aliases (`--ink`, `--text`, `--muted`, `--gold-l`, etc.) are also defined so all 34 pages carried over from earlier sessions continue to render correctly.

## Known cosmetic differences

Pages built across different sessions use slightly different CSS patterns (some use `.section-header`, some use `.site-header > .logo`). The compatibility layer in `main.css` handles both. If you want 100% visual consistency later, the earlier pages (`numerology/*.html`, `angel-numbers/*.html`, `pages/numerology.html`, `pages/angel-numbers.html`, `pages/blog.html`, `pages/faq.html`, `pages/login.html`, `blog/life-path-number-guide.html`) can be migrated to the newer pattern used in `index.html`, `pages/pricing.html`, etc. Not blocking for launch.

## SEO baseline

Every page has:
- Unique `<title>` and `<meta description>`
- Canonical URL
- OpenGraph tags for social sharing
- Mobile-first responsive layout (viewport meta)
- Semantic HTML (`<article>`, `<main>`, `<nav>`, `<footer>`)

Pages with JSON-LD structured data:
- `index.html` — WebApplication schema + AggregateRating
- `pages/faq.html` — FAQPage schema (20+ Q&A)
- All 6 blog articles — Article schema

## Browser support

Tested mental models: Chrome/Safari/Firefox current-2, mobile Safari iOS 15+, mobile Chrome Android 10+. Uses modern CSS (clamp, grid, backdrop-filter) and vanilla JS (no frameworks).

Graceful degradation: if JavaScript is disabled, the landing calculator doesn't function but all content pages (articles, life-paths, angel-numbers, glossary, legal) remain fully readable.

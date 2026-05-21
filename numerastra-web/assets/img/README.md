# Image assets

## Required before launch

### og-image.jpg (1200×630px)
Social sharing preview image. Referenced by every page's OpenGraph metadata.

**Recommended design:**
- Dark indigo background (#0B0D17)
- Gold "N" circle logo (large, top-left or centered)
- Tagline: "Decode the language of numbers"
- Visual element: layered number triangles (3, 5, 7) suggesting the three systems
- Numerastra wordmark, Crimson Text serif
- 1200×630px, JPG, under 1MB

**Why it matters:** WhatsApp/LinkedIn/Facebook/Twitter/Slack all pull this image when someone shares a Numerastra link. Missing = broken link preview = 30% lower CTR on shared links.

### favicon.ico (32×32, 48×48, 192×192 for PWA)
Browser tab icon. Simple gold "N" on indigo square.

### apple-touch-icon.png (180×180px)
iOS home-screen icon when someone saves the site to their phone.

## Optional

- `hero-bg.jpg` — if you want a subtle background texture on the landing page
- `badge-razorpay.svg`, `badge-stripe.svg` — trust badges for checkout pages
- 6 blog post hero images (currently using CSS glyphs as placeholders)

## Generation

You can generate these via Canva, Figma, or have a designer produce them. Once created, drop them in this folder — no code changes needed. The paths are already wired up:
- `https://numerastra.com/assets/img/og-image.jpg`
- `https://numerastra.com/favicon.ico`
- `https://numerastra.com/apple-touch-icon.png` (add favicon links in each page's <head>)

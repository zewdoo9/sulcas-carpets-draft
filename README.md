# Sulcas Carpets — Draft Marketing Site

Pitch demo for **Eddie Eabisa**. Static, self-contained preview of a mobile-first marketing site for Sulcas Carpets (Elk Grove flooring & remodel). Built from public listings for discussion only — not the official live site.

## How to open

**Option A — open the file**

```bash
# macOS
open /workspace/sulcas-carpets-site/index.html

# Linux
xdg-open /workspace/sulcas-carpets-site/index.html
```

Or double-click `index.html` in a file browser.

**Option B — local server (recommended for map iframe / fonts)**

```bash
cd /workspace/sulcas-carpets-site
python3 -m http.server 8080
```

Then visit: [http://localhost:8080](http://localhost:8080)

## Files

| File | Purpose |
|------|---------|
| `index.html` | Single-page site |
| `styles.css` | Custom premium CSS (no build step) |
| `script.js` | Mobile nav + demo estimate form toast |
| `NOTES.md` | Claims to confirm with owner before go-live |

## Stack

- Plain HTML / CSS / JS
- Google Fonts (Cormorant Garamond + Outfit)
- Unsplash sample images (replace with real project photos)
- Google Maps embed for the showroom address

No npm, no bundler, no framework.

# Newsletter Builder vNext (Scaffold v0.2)

This scaffold is designed so **fonts, portable rich text, and assets** are first-class and *export-safe*.

## Quick start (Windows CMD)
```bat
cd C:\NAP_VNEXT
npm install
npm run dev
```

## Build
```bat
npm run build
npm run preview
```

## GH Pages deploy
1) Create a new GitHub repo, e.g. `NAP_News_VNEXT`
2) In Windows CMD:
```bat
set VITE_BASE=/NAP_News_VNEXT/
npm run build
npm run deploy
```

## Exports
### Export JSON (from Builder)
- Click **Export JSON** → downloads `newsletter.json`

### Export Email HTML (from Builder)
- Click **Export Email HTML** → downloads `newsletter_email.html`

### Export web bundle (zip)
This copies `dist/` + `newsletter.json` + `public/assets` into `export_web/` and creates `export_web.zip`:
```bat
npm run build
npm run export:web:zip
```

Then you can host `export_web/` on any static server (or unzip on a host).

## Data model
- `theme.fonts[]` uses `FontSpec` so you can later switch between Google and local `@font-face`.
- Rich text is stored as a neutral AST (portable) so Web/Email/PDF can share the same content.
- `assets[]` provides an asset manifest; blocks reference assets by `assetId`.

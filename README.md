# NewsForge

> Free, open-source newsletter builder — runs entirely in your browser.

**Live demo:** [your-github-username.github.io/newsforge](https://your-github-username.github.io/newsforge)

---

## Features

- **8 block types** — Text (Markdown), Article, Ticker, Image, HTML, Button, Divider, Spacer
- **Full HTML block** — write raw HTML with a custom friendly label
- **URL links** — Markdown `[Label](url)` links in text blocks, footer links in branding
- **Newsletter library** — save and load multiple newsletters from browser storage
- **3-column layouts** — single, 2-column, and 3-column section layouts
- **Email HTML export** — clean, client-compatible HTML ready for any ESP
- **JSON export/import** — portable newsletter format
- **Undo/Redo** — full history with Ctrl+Z / Ctrl+Y
- **Responsive preview** — mobile / tablet / desktop viewport switching
- **No accounts, no backend, no fees**

---

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy to GitHub Pages

### One-time setup

1. Go to your repo on GitHub → **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. Go to **Settings** → **Secrets and variables** → **Actions** → **Variables** → **New repository variable**
   - Name: `VITE_BASE`
   - Value: `/your-repo-name/` (e.g. `/newsforge/`)

### Deploy

Push to `main` — GitHub Actions will automatically build and deploy.

The workflow file is at `.github/workflows/deploy.yml`.

---

## Architecture

```
src/
├── core/
│   ├── email/          # Email HTML export
│   ├── issue/          # Schema (Zod), defaults, migrate, normalize, validate
│   ├── richtext/       # Portable RichText AST: parse, render React, render Email
│   ├── storage/        # Library (multi-newsletter localStorage), undo stack
│   └── theme/          # CSS variable tokens
├── renderer/
│   ├── blocks/         # Block registry + 8 block type components
│   └── layout/         # Header, Footer, Page, SectionFrame
├── shared/             # IssueContext, useIssueAsset
└── ui/
    ├── pages/          # Builder, Home, Viewer
    └── styles.css      # All styles
```

### Adding a new block type

1. Add the type to `BlockSchema` enum in `src/core/issue/schema.ts`
2. Create `src/renderer/blocks/types/YourBlock.tsx`
3. Register it in `src/renderer/blocks/registry.ts`
4. Add default data in `BLOCK_DEFAULTS` in `Builder.tsx`
5. Add an inspector component in `Builder.tsx`
6. Handle it in `src/core/email/emailExport.ts`

---

## Contributing

Issues and PRs welcome! This project is designed to grow — new block types, themes, and export formats are all good directions.

## License

MIT

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const OUT = path.join(ROOT, "export_web");
const ISSUE = path.join(ROOT, "newsletter.json");

const rm = (p) => fs.existsSync(p) && fs.rmSync(p, { recursive: true, force: true });
const cp = (src, dst) => fs.cpSync(src, dst, { recursive: true });

if (!fs.existsSync(DIST)) {
  console.error("❌ dist/ not found. Run: npm run build");
  process.exit(1);
}

rm(OUT);
fs.mkdirSync(OUT, { recursive: true });

cp(DIST, OUT);

// Prefer root newsletter.json (exported from app); else use public/newsletter.json
const pubIssue = path.join(ROOT, "public", "newsletter.json");
const chosen = fs.existsSync(ISSUE) ? ISSUE : (fs.existsSync(pubIssue) ? pubIssue : null);
if (chosen) {
  fs.copyFileSync(chosen, path.join(OUT, "newsletter.json"));
  console.log("✅ Copied newsletter.json -> export_web/newsletter.json");
} else {
  console.warn("⚠️ No newsletter.json found (root or public). Viewer will prompt file import.");
}

// Copy public assets folder if present (optional)
const pubAssets = path.join(ROOT, "public", "assets");
if (fs.existsSync(pubAssets)) {
  cp(pubAssets, path.join(OUT, "assets"));
  console.log("✅ Copied public/assets -> export_web/assets");
}

console.log("✅ export_web ready:", OUT);

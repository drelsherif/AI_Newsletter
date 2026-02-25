import type { Issue } from "../issue/schema";

function fontStack(issue: Issue, role: "body"|"heading"|"mono"): string {
  const f = issue.theme.fonts.find(x => x.role === role);
  if (!f) return role === "heading" ? 'Georgia, serif' : role === "mono" ? 'ui-monospace, monospace' : 'system-ui, sans-serif';
  const fallbacks = (f.fallbacks ?? []).join(", ");
  return `"${f.family}"${fallbacks ? ", " + fallbacks : ""}`;
}

export function issueToCssVars(issue: Issue): Record<string, string> {
  const t = issue.theme;
  const b = issue.brand;
  return {
    "--font-body": fontStack(issue, "body"),
    "--font-heading": fontStack(issue, "heading"),
    "--font-mono": fontStack(issue, "mono"),
    "--maxw": `${t.maxWidthPx}px`,
    "--radius": `${t.radiusPx}px`,
    "--bg": t.bg,
    "--panel": t.panel,
    "--text": t.text,
    "--muted": t.muted,
    "--primary": b.primaryColor,
    "--accent": b.accentColor
  };
}

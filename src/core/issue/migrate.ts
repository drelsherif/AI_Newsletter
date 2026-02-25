import type { Issue } from "./schema";

export function migrateIssue(raw: unknown): Issue {
  const issue = raw as any;

  // Backfill logoMode
  if (issue?.brand && !issue.brand.logoMode) {
    issue.brand.logoMode = issue.brand.logoUrl ? "image" : "text";
  }

  // Backfill feed articles array
  if (Array.isArray(issue?.feeds)) {
    for (const f of issue.feeds) {
      if (!Array.isArray(f.articles)) f.articles = [];
      if (!f.name) f.name = f.url ?? "";
      if (!f.maxArticles) f.maxArticles = 10;
    }
  }

  // Normalize old layout names
  if (Array.isArray(issue?.sections)) {
    for (const s of issue.sections) {
      if (!["single", "twoColumn", "threeColumn"].includes(s.layout)) {
        s.layout = "single";
      }
    }
  }

  // Migrate old brand colors
  if (issue?.brand?.primaryColor === "#0057A8") issue.brand.primaryColor = "#4F7FFF";
  if (issue?.brand?.accentColor === "#00B5CC") issue.brand.accentColor = "#7C3AED";

  return { ...issue, schemaVersion: 4 } as Issue;
}

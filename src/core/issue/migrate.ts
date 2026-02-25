import type { Issue } from "./schema";

export function migrateIssue(issue: Issue): Issue {
  // v1/v2 -> v3: update block types, layout values
  const migrated = { ...issue, schemaVersion: 3 } as Issue;

  // Migrate layout names: "twoColumn" stays, add "threeColumn" support
  migrated.sections = (migrated.sections ?? []).map(sec => ({
    ...sec,
    layout: sec.layout === "twoColumn" ? "twoColumn" : sec.layout === "threeColumn" ? "threeColumn" : "single"
  }));

  // Migrate brand colors from old defaults
  if (migrated.brand.primaryColor === "#0057A8") migrated.brand.primaryColor = "#4F7FFF";
  if (migrated.brand.accentColor === "#00B5CC") migrated.brand.accentColor = "#7C3AED";

  return migrated;
}

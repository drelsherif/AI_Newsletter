import type { Issue } from "./schema";

/**
 * v2 introduces:
 * - theme.fonts[]
 * - assets[]
 * - portable RichText blocks in text/article/image captions
 */
export function migrateIssue(issue: Issue): Issue {
  if (!issue.schemaVersion || issue.schemaVersion < 2) {
    // Future: add conversions from v1 -> v2
    return { ...issue, schemaVersion: 2 } as Issue;
  }
  return issue;
}

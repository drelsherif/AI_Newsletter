import type { Issue } from "../issue/schema";
import { issueToCssVars } from "./tokens";

export function applyIssueTheme(issue: Issue, el: HTMLElement) {
  const vars = issueToCssVars(issue);
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
}

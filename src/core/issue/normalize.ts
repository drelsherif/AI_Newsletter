import { IssueSchema, type Issue } from "./schema";

export function normalizeIssue(input: unknown): Issue {
  const any = input as any;
  const candidate = any?.newsletter ?? any?.issue ?? any?.data ?? any ?? {};

  if (Array.isArray(candidate?.sections)) {
    for (const s of candidate.sections) {
      if (s && s.blocks && !Array.isArray(s.blocks)) s.blocks = Object.values(s.blocks);
    }
  }
  if (candidate?.assets && !Array.isArray(candidate.assets)) candidate.assets = Object.values(candidate.assets);

  return IssueSchema.parse(candidate);
}

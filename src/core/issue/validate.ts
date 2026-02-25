import { IssueSchema } from "./schema";

export type ValidationError = { path: string; message: string };

export function validateIssue(input: unknown): ValidationError[] {
  const res = IssueSchema.safeParse(input);
  if (res.success) return [];
  return res.error.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message
  }));
}

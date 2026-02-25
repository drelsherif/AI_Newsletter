import React, { createContext, useContext } from "react";
import type { Issue } from "../core/issue/schema";

const Ctx = createContext<Issue | null>(null);

export function IssueProvider({ issue, children }: { issue: Issue; children: React.ReactNode }) {
  return <Ctx.Provider value={issue}>{children}</Ctx.Provider>;
}

export function useIssue() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useIssue must be used within IssueProvider");
  return v;
}

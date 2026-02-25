import { useMemo } from "react";
import { useIssue } from "./IssueContext";

export function useIssueAsset(assetId: string) {
  const issue = useIssue();
  return useMemo(() => issue.assets.find(a => a.id === assetId) ?? null, [issue, assetId]);
}

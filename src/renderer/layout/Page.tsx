import React from "react";
import type { Issue } from "../../core/issue/schema";
import type { RenderMode } from "../modes";

export function Page({ issue, mode, children }: { issue: Issue; mode: RenderMode; children: React.ReactNode }) {
  return (
    <div className={`nl-page${mode === "email" ? " nl-page-email" : ""}`}>
      <div className="nl-page-inner" style={{ maxWidth: `${issue.theme.maxWidthPx}px` }}>
        {children}
      </div>
    </div>
  );
}

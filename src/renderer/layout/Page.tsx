import React from "react";
import type { Issue } from "../../core/issue/schema";
import type { RenderMode } from "../modes";

export function Page({ issue, mode, children }: { issue: Issue; mode: RenderMode; children: React.ReactNode }) {
  const email = mode === "email";
  return (
    <div className={email ? "page email" : "page"}>
      <div className="page-inner">{children}</div>
    </div>
  );
}

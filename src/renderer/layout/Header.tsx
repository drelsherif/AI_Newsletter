import React from "react";
import type { Issue } from "../../core/issue/schema";

export function Header({ issue }: { issue: Issue }) {
  const m = issue.meta;
  return (
    <header className="hdr">
      <div className="hdr-left">
        <div className="hdr-logo">{issue.brand.logoText ?? m.title}</div>
        <div className="hdr-sub">
          <span>{m.orgName || "—"}</span>
          <span className="dot">•</span>
          <span>{m.department || "—"}</span>
        </div>
      </div>
      <div className="hdr-right">
        <div className="hdr-title">{m.title}</div>
        <div className="hdr-meta">
          <span>Issue {m.issueNumber}</span>
          <span className="dot">•</span>
          <span>{m.dateISO}</span>
        </div>
      </div>
    </header>
  );
}

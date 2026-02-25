import React from "react";
import type { Issue } from "../../core/issue/schema";

export function Header({ issue }: { issue: Issue }) {
  const m = issue.meta;
  const b = issue.brand;

  return (
    <header className="nl-header" style={{
      background: `linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, ${b.primaryColor} 100%)`
    }}>
      <div className="nl-header-inner">
        {b.logoText && (
          <div className="nl-logo">{b.logoText}</div>
        )}
        <div className="nl-title">{m.title}</div>
        <div className="nl-meta">
          <span>Issue {m.issueNumber}</span>
          <span>{m.dateISO}</span>
          {m.orgName && <span>{m.orgName}</span>}
          {m.editors && m.editors.length > 0 && (
            <span>{m.editors.join(", ")}</span>
          )}
        </div>
      </div>
    </header>
  );
}

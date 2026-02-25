import React from "react";
import type { Issue } from "../../core/issue/schema";

function LogoRenderer({ brand }: { brand: Issue["brand"] }) {
  const mode = brand.logoMode ?? "text";

  if (mode === "image" && brand.logoUrl) {
    return (
      <div className="nl-logo-wrap">
        <img
          src={brand.logoUrl}
          alt={brand.logoText || "Logo"}
          className="nl-logo-img"
        />
      </div>
    );
  }

  if (mode === "html" && brand.logoHtml) {
    return (
      <div
        className="nl-logo-html"
        dangerouslySetInnerHTML={{ __html: brand.logoHtml }}
      />
    );
  }

  if (brand.logoText) {
    return <div className="nl-logo">{brand.logoText}</div>;
  }

  return null;
}

export function Header({ issue }: { issue: Issue }) {
  const m = issue.meta;
  const b = issue.brand;

  return (
    <header
      className="nl-header"
      style={{
        background: `linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, ${b.primaryColor} 100%)`,
      }}
    >
      <div className="nl-header-inner">
        <LogoRenderer brand={b} />
        <div className="nl-title">{m.title}</div>
        <div className="nl-meta">
          <span>Issue {m.issueNumber}</span>
          {m.dateISO && <span>{m.dateISO}</span>}
          {m.orgName && <span>{m.orgName}</span>}
          {m.editors && m.editors.length > 0 && (
            <span>{m.editors.join(", ")}</span>
          )}
        </div>
      </div>
    </header>
  );
}

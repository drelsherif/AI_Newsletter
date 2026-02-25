import React from "react";
import type { Issue } from "../../core/issue/schema";

export function Footer({ issue }: { issue: Issue }) {
  const m = issue.meta;
  const b = issue.brand;

  return (
    <footer className="nl-footer">
      <div className="nl-footer-row">
        {m.disclaimer && (
          <div className="nl-footer-disclaimer">{m.disclaimer}</div>
        )}
        {m.contactEmail && (
          <div className="nl-footer-contact">{m.contactEmail}</div>
        )}
      </div>
      {b.footerLinks && b.footerLinks.length > 0 && (
        <div className="nl-footer-links">
          {b.footerLinks.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
          ))}
        </div>
      )}
    </footer>
  );
}

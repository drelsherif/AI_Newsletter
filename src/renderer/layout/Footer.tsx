import React from "react";
import type { Issue } from "../../core/issue/schema";

export function Footer({ issue }: { issue: Issue }) {
  const email = issue.meta.contactEmail;
  return (
    <footer className="ftr">
      <div className="ftr-row">
        <div className="ftr-muted">
          {issue.meta.disclaimer || "This newsletter is informational and specialty/institution agnostic by design."}
        </div>
      </div>
      <div className="ftr-row">
        <div className="ftr-links">
          {issue.brand.footerLinks?.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
          ))}
        </div>
        {email ? <div className="ftr-email">{email}</div> : null}
      </div>
    </footer>
  );
}

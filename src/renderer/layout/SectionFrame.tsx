import React from "react";
import type { Section } from "../../core/issue/schema";

export function SectionFrame({ section, children }: { section: Section; children: React.ReactNode }) {
  return (
    <section className="nl-section">
      {section.title && <h2 className="nl-section-title">{section.title}</h2>}
      <div className="nl-section-body">{children}</div>
    </section>
  );
}

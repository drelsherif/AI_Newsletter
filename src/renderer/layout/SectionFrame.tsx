import React from "react";
import type { Section } from "../../core/issue/schema";

export function SectionFrame({ section, children }: { section: Section; children: React.ReactNode }) {
  return (
    <section className="sec">
      {section.title ? <h2 className="sec-title">{section.title}</h2> : null}
      <div className="sec-body">{children}</div>
    </section>
  );
}

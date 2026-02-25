import React from "react";
import type { Issue } from "../core/issue/schema";
import type { RenderMode } from "./modes";
import { Page } from "./layout/Page";
import { Header } from "./layout/Header";
import { Footer } from "./layout/Footer";
import { SectionFrame } from "./layout/SectionFrame";
import { BlockHost } from "./blocks/BlockHost";
import { IssueProvider } from "../shared/IssueContext";

function SectionLayout({ section, mode }: { section: Issue["sections"][number]; mode: RenderMode }) {
  const colClass =
    section.layout === "twoColumn" ? "nl-grid nl-grid-2" :
    section.layout === "threeColumn" ? "nl-grid nl-grid-3" :
    "nl-grid nl-grid-1";

  return (
    <div className={colClass}>
      {section.blocks.map((b) => (
        <BlockHost key={b.id} block={b} mode={mode} />
      ))}
    </div>
  );
}

export function Renderer({ issue, mode }: { issue: Issue; mode: RenderMode }) {
  return (
    <IssueProvider issue={issue}>
      <div className="nl-root">
        <Page issue={issue} mode={mode}>
          <Header issue={issue} />
          <div className="nl-body-wrap">
            {issue.sections.map((s) => (
              <SectionFrame key={s.id} section={s}>
                <SectionLayout section={s} mode={mode} />
              </SectionFrame>
            ))}
          </div>
          <Footer issue={issue} />
        </Page>
      </div>
    </IssueProvider>
  );
}

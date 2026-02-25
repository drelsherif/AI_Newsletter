import React, { useEffect, useRef } from "react";
import type { Issue } from "../core/issue/schema";
import type { RenderMode } from "./modes";
import { applyIssueTheme } from "../core/theme/applyTheme";
import { Page } from "./layout/Page";
import { Header } from "./layout/Header";
import { Footer } from "./layout/Footer";
import { SectionFrame } from "./layout/SectionFrame";
import { BlockHost } from "./blocks/BlockHost";
import { IssueProvider } from "../shared/IssueContext";

function SectionLayout({ section, mode }: { section: Issue["sections"][number]; mode: RenderMode }) {
  const two = section.layout === "twoColumn";
  return (
    <div className={two ? "grid two" : "grid one"}>
      {section.blocks.map((b) => (
        <BlockHost key={b.id} block={b} mode={mode} />
      ))}
    </div>
  );
}

export function Renderer({ issue, mode }: { issue: Issue; mode: RenderMode }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (hostRef.current) applyIssueTheme(issue, hostRef.current);
  }, [issue]);

  return (
    <IssueProvider issue={issue}>
      <div ref={hostRef} className="host">
        <Page issue={issue} mode={mode}>
          <Header issue={issue} />
          {issue.sections.map((s) => (
            <SectionFrame key={s.id} section={s}>
              <SectionLayout section={s} mode={mode} />
            </SectionFrame>
          ))}
          <Footer issue={issue} />
        </Page>
      </div>
    </IssueProvider>
  );
}

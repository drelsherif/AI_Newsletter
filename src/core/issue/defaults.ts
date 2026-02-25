import type { Issue } from "./schema";

export const defaultIssue: Issue = {
  schemaVersion: 4,
  meta: {
    title: "Monthly Digest",
    issueNumber: "001",
    dateISO: new Date().toISOString().slice(0, 10),
    editors: ["Your Name"],
    orgName: "Your Organization",
    department: "",
    contactEmail: "editor@example.com",
    disclaimer: `© ${new Date().getFullYear()} Your Organization. All rights reserved.`,
  },
  brand: {
    logoMode: "text",
    logoText: "MONTHLY DIGEST",
    logoUrl: undefined,
    logoHtml: undefined,
    primaryColor: "#4F7FFF",
    accentColor: "#7C3AED",
    footerLinks: [
      { label: "Unsubscribe", href: "#unsubscribe" },
      { label: "View Online", href: "#view" },
    ],
  },
  theme: {
    fonts: [
      { role: "body", family: "Lora", fallbacks: ["Georgia", "serif"] },
      { role: "heading", family: "Syne", fallbacks: ["system-ui", "sans-serif"] },
      { role: "mono", family: "JetBrains Mono", fallbacks: ["ui-monospace", "monospace"] },
    ],
    maxWidthPx: 680,
    radiusPx: 12,
    bg: "#ffffff",
    panel: "rgba(0,0,0,0.03)",
    text: "#1a1a2e",
    muted: "#6b7280",
  },
  assets: [],
  sections: [
    {
      id: "sec-ticker",
      title: "",
      layout: "single",
      blocks: [
        {
          id: "blk-ticker",
          type: "ticker",
          label: "News Ticker",
          data: {
            items:
              "Welcome to the newsletter • New features launched this month • Submit your stories for next issue",
          },
        },
      ],
    },
    {
      id: "sec-hero",
      title: "Top Story",
      layout: "single",
      blocks: [
        {
          id: "blk-hero-article",
          type: "article",
          label: "Feature Story",
          data: {
            title: "The Future of AI-Powered Communications",
            source: "Tech Insights • 2025",
            href: "https://example.com/article",
            summary: [
              {
                t: "p",
                c: [
                  {
                    t: "txt",
                    v: "A landmark study reveals how artificial intelligence is reshaping internal communications across organizations. Early adopters report a 40% reduction in time-to-publish and significantly higher reader engagement.",
                  },
                ],
              },
            ],
            _md: "A landmark study reveals how artificial intelligence is reshaping internal communications.",
            linkText: "Read full story →",
          },
        },
      ],
    },
    {
      id: "sec-two",
      title: "Quick Updates",
      layout: "twoColumn",
      blocks: [
        {
          id: "blk-update1",
          type: "text",
          label: "Policy Update",
          data: {
            heading: "Policy Update",
            body: [
              {
                t: "p",
                c: [
                  {
                    t: "txt",
                    v: "New remote work guidelines take effect next quarter. All managers should review the updated handbook.",
                  },
                ],
              },
            ],
            _md: "New remote work guidelines take effect next quarter.",
            links: [],
          },
        },
        {
          id: "blk-update2",
          type: "text",
          label: "Team Spotlight",
          data: {
            heading: "Team Spotlight",
            body: [
              {
                t: "p",
                c: [
                  {
                    t: "txt",
                    v: "Congratulations to the product team for shipping the new dashboard ahead of schedule.",
                  },
                ],
              },
            ],
            _md: "Congratulations to the product team for shipping ahead of schedule.",
            links: [],
          },
        },
      ],
    },
    {
      id: "sec-cta",
      title: "",
      layout: "single",
      blocks: [
        {
          id: "blk-cta-btn",
          type: "button",
          label: "CTA Button",
          data: {
            text: "Register for Next Webinar",
            href: "https://example.com/register",
            color: "#4F7FFF",
            textColor: "#ffffff",
            align: "center",
          },
        },
      ],
    },
  ],
  feeds: [],
};

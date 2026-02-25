import type { Issue } from "./schema";

export const defaultIssue: Issue = {
  schemaVersion: 3,
  meta: {
    title: "Monthly Digest",
    issueNumber: "001",
    dateISO: new Date().toISOString().slice(0, 10),
    editors: ["Your Name"],
    orgName: "Your Organization",
    department: "",
    contactEmail: "editor@example.com",
    disclaimer: `© ${new Date().getFullYear()} Your Organization. All rights reserved. This newsletter is for informational purposes only.`
  },
  brand: {
    logoText: "MONTHLY DIGEST",
    primaryColor: "#4F7FFF",
    accentColor: "#7C3AED",
    footerLinks: [
      { label: "Unsubscribe", href: "#unsubscribe" },
      { label: "View Online", href: "#view" }
    ]
  },
  theme: {
    fonts: [
      { role: "body", family: "Lora", fallbacks: ["Georgia", "serif"] },
      { role: "heading", family: "Syne", fallbacks: ["system-ui", "sans-serif"] },
      { role: "mono", family: "JetBrains Mono", fallbacks: ["ui-monospace", "monospace"] }
    ],
    maxWidthPx: 680,
    radiusPx: 12,
    bg: "#ffffff",
    panel: "rgba(0,0,0,0.03)",
    text: "#1a1a2e",
    muted: "#6b7280"
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
            items: ["Welcome to the newsletter • New features launched this month • Submit your stories for next issue"]
          }
        }
      ]
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
            summary: "A landmark study reveals how artificial intelligence is reshaping internal communications across organizations. Early adopters report a 40% reduction in time-to-publish and significantly higher reader engagement.\n\nLeaders who embrace these tools early are finding competitive advantages in both speed and quality of their communications.",
            _md: "A landmark study reveals how artificial intelligence is reshaping internal communications across organizations.",
            linkText: "Read full story →"
          }
        }
      ]
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
            body: [{ t: "p", c: [{ t: "txt", v: "New remote work guidelines take effect next quarter. All managers should review the updated handbook before the town hall meeting." }] }],
            _md: "New remote work guidelines take effect next quarter. All managers should review the updated handbook.",
            links: []
          }
        },
        {
          id: "blk-update2",
          type: "text",
          label: "Team Spotlight",
          data: {
            heading: "Team Spotlight",
            body: [{ t: "p", c: [{ t: "txt", v: "Congratulations to the product team for shipping the new dashboard ahead of schedule. Strong adoption in the first week." }] }],
            _md: "Congratulations to the product team for shipping the new dashboard ahead of schedule.",
            links: []
          }
        }
      ]
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
            align: "center"
          }
        }
      ]
    },
    {
      id: "sec-div1",
      title: "",
      layout: "single",
      blocks: [
        { id: "blk-div1", type: "divider", label: "Divider", data: { style: "line" } }
      ]
    },
    {
      id: "sec-html",
      title: "Custom Section",
      layout: "single",
      blocks: [
        {
          id: "blk-html1",
          type: "html",
          label: "Custom HTML",
          data: {
            label: "Announcement Banner",
            html: `<div style="background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:20px 24px;border-radius:12px;text-align:center">
  <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.5);margin-bottom:8px">Announcement</div>
  <div style="font-size:20px;font-weight:700;margin-bottom:8px">Join us for the Annual Summit</div>
  <div style="font-size:14px;color:rgba(255,255,255,0.75)">June 15–17, 2025 • San Francisco, CA</div>
</div>`
          }
        }
      ]
    }
  ],
  feeds: []
};

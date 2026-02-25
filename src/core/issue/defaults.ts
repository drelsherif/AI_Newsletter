import type { Issue } from "./schema";

export const defaultIssue: Issue = {
  schemaVersion: 2,
  meta: {
    title: "New Newsletter",
    issueNumber: "001",
    dateISO: new Date().toISOString().slice(0, 10),
    editors: [],
    orgName: "",
    department: "",
    contactEmail: "",
    disclaimer: ""
  },
  brand: {
    logoText: "Newsletter",
    primaryColor: "#0057A8",
    accentColor: "#00B5CC",
    footerLinks: []
  },
  theme: {
    fonts: [
      { role: "body", family: "DM Sans", fallbacks: ["system-ui","-apple-system","Segoe UI","Roboto","Arial","sans-serif"] },
      { role: "heading", family: "DM Serif Display", fallbacks: ["Georgia","serif"] },
      { role: "mono", family: "DM Mono", fallbacks: ["ui-monospace","SFMono-Regular","Menlo","Monaco","Consolas","monospace"] }
    ],
    maxWidthPx: 1100,
    radiusPx: 16,
    bg: "#03080F",
    panel: "rgba(255,255,255,0.06)",
    text: "rgba(255,255,255,0.92)",
    muted: "rgba(255,255,255,0.65)"
  },
  assets: [],
  sections: [],
  feeds: []
};

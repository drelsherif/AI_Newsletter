import type { Issue, Block } from "../issue/schema";
import { richTextToEmailHtml } from "../richtext/toEmailHtml";

function esc(s: string): string {
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return iso.slice(0,10); }
}

function renderBlockEmail(bl: Block, issue: Issue, primary: string): string {
  const d: Record<string,unknown> = (bl.data ?? {}) as Record<string,unknown>;

  if (bl.type === "text") {
    const body = Array.isArray(d.body) ? richTextToEmailHtml(d.body as any) : "";
    const links = Array.isArray(d.links) && (d.links as any[]).length > 0
      ? `<div style="margin-top:12px">${(d.links as any[]).map(l =>
          `<a href="${esc(l.href)}" style="display:inline-block;margin-right:10px;margin-bottom:4px;padding:5px 14px;border-radius:99px;border:1px solid rgba(79,127,255,0.35);font-size:12px;color:#4F7FFF;text-decoration:none;font-family:Arial,sans-serif;font-weight:700">→ ${esc(l.label)}</a>`
        ).join("")}</div>`
      : "";
    return `<div style="padding:18px 20px;background:#f9fafb;border-radius:10px;margin-bottom:12px;border:1px solid #f3f4f6">
      ${d.heading ? `<div style="font-family:Arial,sans-serif;font-size:14px;font-weight:700;margin-bottom:10px;color:#1a1a2e">${esc(d.heading as string)}</div>` : ""}
      <div style="font-size:14px;line-height:1.65;color:#374151;font-family:Georgia,serif">${body}</div>
      ${links}
    </div>`;
  }

  if (bl.type === "article") {
    const summary = Array.isArray(d.summary) ? richTextToEmailHtml(d.summary as any) : "";
    const titleHtml = d.href
      ? `<a href="${esc(d.href as string)}" style="color:#1a1a2e;text-decoration:none;font-size:17px;font-weight:700;line-height:1.3;font-family:Georgia,serif">${esc(d.title as string ?? "")}</a>`
      : `<span style="font-size:17px;font-weight:700;line-height:1.3;color:#1a1a2e;font-family:Georgia,serif">${esc(d.title as string ?? "")}</span>`;
    return `<div style="padding:18px 20px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:12px;background:#fff">
      ${d.source ? `<div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#9ca3af;margin-bottom:6px">${esc(d.source as string)}</div>` : ""}
      <div style="margin-bottom:10px">${titleHtml}</div>
      ${summary ? `<div style="font-size:14px;line-height:1.65;color:#4b5563;font-family:Georgia,serif">${summary}</div>` : ""}
      ${d.href ? `<a href="${esc(d.href as string)}" style="display:inline-block;margin-top:12px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:${esc(primary)};text-decoration:none">${esc((d.linkText as string) || "Read more →")}</a>` : ""}
    </div>`;
  }

  if (bl.type === "ticker") {
    let items: string[] = [];
    if (Array.isArray(d.items)) items = (d.items as unknown[]).map(String);
    else if (typeof d.items === "string") items = d.items.split("•").map((x:string) => x.trim()).filter(Boolean);
    return `<div style="padding:14px 18px;background:#1a1a2e;border-radius:10px;margin-bottom:12px">
      ${items.map(item => `<span style="display:inline-block;margin:3px 4px;padding:4px 12px;border-radius:99px;background:rgba(79,127,255,0.25);border:1px solid rgba(79,127,255,0.4);font-family:Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.9)">${esc(item)}</span>`).join("")}
    </div>`;
  }

  if (bl.type === "rss") {
    const feedIds = Array.isArray(d.feedIds) ? (d.feedIds as string[]) : [];
    const maxArticles = Number(d.maxArticles) || 10;
    const articles = issue.feeds
      .filter(f => feedIds.length === 0 || feedIds.includes(f.id))
      .flatMap(f => f.articles)
      .slice(0, maxArticles);

    if (articles.length === 0) {
      return `<div style="padding:14px 18px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:12px;font-family:Arial,sans-serif;font-size:12px;color:#9ca3af">No RSS articles — fetch feeds in the editor before exporting.</div>`;
    }

    return `<div style="margin-bottom:12px">
      ${articles.map(a => `
        <div style="padding:14px 18px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:8px;background:#fff">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
            <span style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af">${esc(a.source)}</span>
            ${a.pubDate ? `<span style="font-family:Arial,sans-serif;font-size:10px;color:#d1d5db">${esc(formatDate(a.pubDate))}</span>` : ""}
          </div>
          ${a.href
            ? `<a href="${esc(a.href)}" style="font-family:Georgia,serif;font-size:15px;font-weight:700;color:#1a1a2e;text-decoration:none;line-height:1.3;display:block;margin-bottom:${a.summary ? "6px" : "0"}">${esc(a.title)}</a>`
            : `<div style="font-family:Georgia,serif;font-size:15px;font-weight:700;color:#1a1a2e;line-height:1.3;margin-bottom:${a.summary ? "6px" : "0"}">${esc(a.title)}</div>`
          }
          ${a.summary ? `<div style="font-family:Georgia,serif;font-size:13px;color:#6b7280;line-height:1.5">${esc(a.summary)}</div>` : ""}
        </div>
      `).join("")}
    </div>`;
  }

  if (bl.type === "html") {
    return `<div style="margin-bottom:12px">${(d.html as string) || ""}</div>`;
  }

  if (bl.type === "divider") {
    const style = (d.style as string) || "line";
    if (style === "dots") return `<div style="text-align:center;color:#d1d5db;letter-spacing:8px;font-size:18px;margin:16px 0">· · ·</div>`;
    if (style === "space") return `<div style="height:${(d.height as number) || 24}px"></div>`;
    return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />`;
  }

  if (bl.type === "button") {
    return `<div style="text-align:${esc((d.align as string) || "center")};padding:12px 0;margin-bottom:12px">
      <a href="${esc((d.href as string) || "#")}" style="display:inline-block;padding:13px 28px;border-radius:99px;background:${esc((d.color as string) || primary)};color:${esc((d.textColor as string) || "#fff")};font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.3px">${esc((d.text as string) || "Click Here")}</a>
    </div>`;
  }

  if (bl.type === "spacer") {
    return `<div style="height:${Math.max(4, Number(d.height) || 24)}px"></div>`;
  }

  if (bl.type === "image") {
    const src = (d.src as string) || "";
    if (!src) return "";
    const imgTag = `<img src="${esc(src)}" alt="${esc((d.alt as string) || "")}" style="width:100%;border-radius:10px;display:block;max-width:100%" />`;
    const wrapped = d.href
      ? `<a href="${esc(d.href as string)}" style="display:block;text-decoration:none">${imgTag}</a>`
      : imgTag;
    const caption = Array.isArray(d.caption) ? richTextToEmailHtml(d.caption as any) : "";
    return `<div style="margin-bottom:12px">
      ${wrapped}
      ${caption ? `<div style="font-size:12px;color:#6b7280;margin-top:6px;font-style:italic;font-family:Georgia,serif">${caption}</div>` : ""}
    </div>`;
  }

  return "";
}

function renderLogoHtml(issue: Issue): string {
  const b = issue.brand;
  const mode = b.logoMode ?? "text";
  if (mode === "image" && b.logoUrl) {
    return `<div style="margin-bottom:14px"><img src="${esc(b.logoUrl)}" alt="${esc(b.logoText || "Logo")}" style="max-height:48px;max-width:200px;object-fit:contain" /></div>`;
  }
  if (mode === "html" && b.logoHtml) {
    // Strip animation CSS for email (email clients don't support it, but we include it anyway — worst case it's ignored)
    return `<div style="margin-bottom:14px">${b.logoHtml}</div>`;
  }
  if (b.logoText) {
    return `<div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:rgba(255,255,255,0.45);margin-bottom:12px">${esc(b.logoText)}</div>`;
  }
  return "";
}

export function issueToEmailHtml(issue: Issue): string {
  const m = issue.meta;
  const b = issue.brand;
  const primary = b.primaryColor;
  const maxW = issue.theme.maxWidthPx || 680;

  const sectionsHtml = issue.sections.map(sec => {
    const secTitle = sec.title
      ? `<div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#9ca3af;padding-bottom:10px;border-bottom:2px solid #f3f4f6;margin-bottom:16px">${esc(sec.title)}</div>`
      : "";

    if (sec.layout === "twoColumn") {
      const half = sec.blocks.map(bl =>
        `<td style="width:50%;vertical-align:top;padding:0 6px">${renderBlockEmail(bl, issue, primary)}</td>`
      ).join("");
      return `<div style="margin-bottom:24px">${secTitle}<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>${half}</tr></table></div>`;
    }
    if (sec.layout === "threeColumn") {
      const third = sec.blocks.map(bl =>
        `<td style="width:33.33%;vertical-align:top;padding:0 5px">${renderBlockEmail(bl, issue, primary)}</td>`
      ).join("");
      return `<div style="margin-bottom:24px">${secTitle}<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>${third}</tr></table></div>`;
    }
    const blocksHtml = sec.blocks.map(bl => renderBlockEmail(bl, issue, primary)).join("");
    return `<div style="margin-bottom:24px">${secTitle}${blocksHtml}</div>`;
  }).join("");

  const footerLinks = (b.footerLinks ?? []).length > 0
    ? `<div style="margin-top:10px">${b.footerLinks.map(l => `<a href="${esc(l.href)}" style="color:#6b7280;text-decoration:none;margin-right:16px;font-size:11px">${esc(l.label)}</a>`).join("")}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${esc(m.title)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Georgia,'Times New Roman',serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6">
  <tr><td align="center" style="padding:24px 16px">
    <table width="${maxW}" cellpadding="0" cellspacing="0" style="max-width:${maxW}px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
      <tr><td style="padding:32px 36px 28px;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,${primary} 100%)">
        ${renderLogoHtml(issue)}
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#ffffff;line-height:1.2;margin-bottom:10px">${esc(m.title)}</div>
        <div style="font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.5)">
          Issue ${esc(m.issueNumber)}${m.dateISO ? " &nbsp;·&nbsp; " + esc(m.dateISO) : ""}${m.orgName ? " &nbsp;·&nbsp; " + esc(m.orgName) : ""}${m.editors?.length ? " &nbsp;·&nbsp; " + m.editors.map(esc).join(", ") : ""}
        </div>
      </td></tr>
      <tr><td style="padding:28px 36px">${sectionsHtml}</td></tr>
      <tr><td style="padding:18px 36px 24px;background:#f9fafb;border-top:1px solid #f3f4f6">
        <div style="font-family:Arial,sans-serif;font-size:11px;color:#9ca3af;line-height:1.6">
          ${m.disclaimer ? `<div>${esc(m.disclaimer)}</div>` : ""}
          ${m.contactEmail ? `<div style="margin-top:4px">${esc(m.contactEmail)}</div>` : ""}
          ${footerLinks}
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

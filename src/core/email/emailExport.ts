import type { Issue, Block } from "../issue/schema";
import { richTextToEmailHtml } from "../richtext/toEmailHtml";

function esc(s: string) {
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function renderBlockEmail(bl: Block, primary: string): string {
  const d: any = bl.data ?? {};

  if (bl.type === "text") {
    const body = Array.isArray(d.body) ? richTextToEmailHtml(d.body) : "";
    const links = Array.isArray(d.links) && d.links.length > 0
      ? `<div style="margin-top:12px">${d.links.map((l: any) =>
          `<a href="${esc(l.href)}" style="display:inline-block;margin-right:12px;font-size:12px;color:${esc(primary)};text-decoration:none;font-weight:600">→ ${esc(l.label)}</a>`
        ).join("")}</div>`
      : "";
    return `
      <div style="padding:18px 20px;background:#f9fafb;border-radius:10px;margin-bottom:12px;border:1px solid #f3f4f6">
        ${d.heading ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;margin-bottom:10px;color:#1a1a2e">${esc(d.heading)}</div>` : ""}
        <div style="font-size:14px;line-height:1.65;color:#374151;font-family:Georgia,'Times New Roman',serif">${body}</div>
        ${links}
      </div>`;
  }

  if (bl.type === "article") {
    const summary = Array.isArray(d.summary) ? richTextToEmailHtml(d.summary) : "";
    const titleHtml = d.href
      ? `<a href="${esc(d.href)}" style="color:#1a1a2e;text-decoration:none;font-size:17px;font-weight:700;line-height:1.3;font-family:Georgia,'Times New Roman',serif">${esc(d.title ?? "")}</a>`
      : `<span style="font-size:17px;font-weight:700;line-height:1.3;color:#1a1a2e;font-family:Georgia,'Times New Roman',serif">${esc(d.title ?? "")}</span>`;
    return `
      <div style="padding:18px 20px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:12px;background:#fff">
        ${d.source ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#9ca3af;margin-bottom:6px">${esc(d.source)}</div>` : ""}
        <div style="margin-bottom:10px">${titleHtml}</div>
        ${summary ? `<div style="font-size:14px;line-height:1.65;color:#4b5563;font-family:Georgia,'Times New Roman',serif">${summary}</div>` : ""}
        ${d.href ? `<a href="${esc(d.href)}" style="display:inline-block;margin-top:12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:${esc(primary)};text-decoration:none">${esc(d.linkText || "Read more →")}</a>` : ""}
      </div>`;
  }

  if (bl.type === "ticker") {
    let items: string[] = [];
    if (Array.isArray(d.items)) items = d.items.map(String);
    else if (typeof d.items === "string") items = d.items.split("•").map((x: string) => x.trim()).filter(Boolean);
    return `
      <div style="padding:14px 18px;background:#1a1a2e;border-radius:10px;margin-bottom:12px">
        ${items.map(item => `<span style="display:inline-block;margin:3px 4px;padding:4px 12px;border-radius:99px;background:rgba(79,127,255,0.25);border:1px solid rgba(79,127,255,0.4);font-family:Arial,Helvetica,sans-serif;font-size:12px;color:rgba(255,255,255,0.9)">${esc(item)}</span>`).join("")}
      </div>`;
  }

  if (bl.type === "html") {
    return `<div style="margin-bottom:12px">${d.html || ""}</div>`;
  }

  if (bl.type === "divider") {
    const style = d.style || "line";
    if (style === "dots") {
      return `<div style="text-align:center;color:#d1d5db;letter-spacing:8px;font-size:18px;margin:16px 0">· · ·</div>`;
    }
    if (style === "space") {
      return `<div style="height:${d.height || 24}px"></div>`;
    }
    return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />`;
  }

  if (bl.type === "button") {
    const align = d.align || "center";
    return `
      <div style="text-align:${esc(align)};padding:12px 0;margin-bottom:12px">
        <a href="${esc(d.href || "#")}" style="display:inline-block;padding:13px 28px;border-radius:99px;background:${esc(d.color || primary)};color:${esc(d.textColor || "#fff")};font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.3px">${esc(d.text || "Click Here")}</a>
      </div>`;
  }

  if (bl.type === "spacer") {
    return `<div style="height:${Math.max(4, Number(d.height) || 24)}px"></div>`;
  }

  if (bl.type === "image") {
    const src = d.src || "";
    const caption = Array.isArray(d.caption) ? richTextToEmailHtml(d.caption) : "";
    if (!src) return "";
    return `
      <div style="margin-bottom:12px">
        <img src="${esc(src)}" alt="${esc(d.alt || "")}" style="width:100%;border-radius:10px;display:block;max-width:100%" />
        ${caption ? `<div style="font-size:12px;color:#6b7280;margin-top:6px;font-style:italic">${caption}</div>` : ""}
      </div>`;
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
      ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#9ca3af;padding-bottom:10px;border-bottom:2px solid #f3f4f6;margin-bottom:16px">${esc(sec.title)}</div>`
      : "";

    if (sec.layout === "twoColumn") {
      const half = sec.blocks.map(bl =>
        `<td style="width:50%;vertical-align:top;padding:0 6px">${renderBlockEmail(bl, primary)}</td>`
      ).join("");
      return `<div style="margin-bottom:24px">${secTitle}<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>${half}</tr></table></div>`;
    }

    if (sec.layout === "threeColumn") {
      const third = sec.blocks.map(bl =>
        `<td style="width:33.33%;vertical-align:top;padding:0 5px">${renderBlockEmail(bl, primary)}</td>`
      ).join("");
      return `<div style="margin-bottom:24px">${secTitle}<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>${third}</tr></table></div>`;
    }

    const blocksHtml = sec.blocks.map(bl => renderBlockEmail(bl, primary)).join("");
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
        <!-- HEADER -->
        <tr><td style="padding:32px 36px 28px;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,${primary} 100%)">
          ${b.logoText ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:rgba(255,255,255,0.45);margin-bottom:12px">${esc(b.logoText)}</div>` : ""}
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#ffffff;line-height:1.2;margin-bottom:10px">${esc(m.title)}</div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(255,255,255,0.5)">
            Issue ${esc(m.issueNumber)}${m.dateISO ? " &nbsp;·&nbsp; " + esc(m.dateISO) : ""}${m.orgName ? " &nbsp;·&nbsp; " + esc(m.orgName) : ""}${m.editors?.length ? " &nbsp;·&nbsp; " + m.editors.map(esc).join(", ") : ""}
          </div>
        </td></tr>
        <!-- BODY -->
        <tr><td style="padding:28px 36px">${sectionsHtml}</td></tr>
        <!-- FOOTER -->
        <tr><td style="padding:18px 36px 24px;background:#f9fafb;border-top:1px solid #f3f4f6">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9ca3af;line-height:1.6">
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

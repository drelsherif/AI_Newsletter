import React, { useEffect, useMemo, useState } from "react";
import { Renderer } from "../../renderer/Renderer";
import { defaultIssue } from "../../core/issue/defaults";
import { normalizeIssue } from "../../core/issue/normalize";
import { migrateIssue } from "../../core/issue/migrate";
import { validateIssue } from "../../core/issue/validate";
import type { Issue, Block, Section } from "../../core/issue/schema";
import { initUndo, pushUndo, undo, redo, type UndoState } from "../../core/storage/undoStack";
import { saveDraft, loadDraft, clearDraft } from "../../core/storage/localDraft";
import { blockRegistry } from "../../renderer/blocks/registry";
import { parseMarkdown } from "../../core/richtext/parseMarkdown";
import { richTextToEmailHtml } from "../../core/richtext/toEmailHtml";

type PreviewMode = "desktop" | "tablet" | "phone";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function issueToEmailHtml(issue: Issue): string {
  // Conservative single-column email wrapper
  const m = issue.meta;
  const primary = issue.brand.primaryColor;
  const bodyFont = issue.theme.fonts.find(f => f.role === "body")?.family ?? "Arial";

  const blocksHtml = issue.sections.map(sec => {
    const title = sec.title ? `<h2 style="margin:16px 0 8px;font-size:18px;color:#111">${sec.title}</h2>` : "";
    const b = sec.blocks.map(bl => {
      const d: any = bl.data ?? {};
      if (bl.type === "ticker") {
        const items = Array.isArray(d.items) ? d.items.map(String) : [];
        return `<div style="padding:10px 12px;border:1px solid #eee;border-radius:12px">
          <div style="font-weight:700;margin-bottom:6px;color:${primary}">Ticker</div>
          <div>${items.map(x=>`<div style="margin:3px 0">${x}</div>`).join("")}</div>
        </div>`;
      }
      if (bl.type === "article") {
        const sum = Array.isArray(d.summary) ? richTextToEmailHtml(d.summary) : "";
        const t = d.href ? `<a href="${d.href}" style="color:${primary};text-decoration:none;font-weight:700">${d.title ?? "Untitled"}</a>` : `<span style="font-weight:700">${d.title ?? "Untitled"}</span>`;
        return `<div style="padding:10px 12px;border:1px solid #eee;border-radius:12px">
          <div style="margin-bottom:4px">${t}</div>
          ${d.source ? `<div style="font-size:12px;color:#666;margin-bottom:6px">${d.source}</div>` : ""}
          ${sum}
        </div>`;
      }
      if (bl.type === "text") {
        const body = Array.isArray(d.body) ? richTextToEmailHtml(d.body) : "";
        return `<div style="padding:10px 12px;border:1px solid #eee;border-radius:12px">
          ${d.heading ? `<div style="font-weight:700;margin-bottom:6px">${d.heading}</div>` : ""}
          ${body}
        </div>`;
      }
      if (bl.type === "image") {
        const cap = Array.isArray(d.caption) ? richTextToEmailHtml(d.caption) : "";
        // email: leave src as-is; user can point to hosted assets before sending
        return `<div style="padding:10px 12px;border:1px solid #eee;border-radius:12px">
          ${d.assetId ? `<div style="font-size:12px;color:#666;margin-bottom:8px">Image: ${d.assetId}</div>` : ""}
          ${cap}
        </div>`;
      }
      return `<div style="padding:10px 12px;border:1px solid #fee;border-radius:12px;color:#a00">Block not email-safe: ${bl.type}</div>`;
    }).join('<div style="height:10px"></div>');

    return `${title}${b}`;
  }).join('<div style="height:16px"></div>');

  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${m.title}</title></head>
<body style="margin:0;background:#f6f7fb;font-family:${bodyFont},Arial,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:18px">
    <div style="background:#fff;border:1px solid #eee;border-radius:16px;padding:18px">
      <div style="font-size:14px;color:#666;margin-bottom:6px">Issue ${m.issueNumber} • ${m.dateISO}</div>
      <div style="font-size:24px;font-weight:800;margin-bottom:10px">${m.title}</div>
      ${m.editors?.length ? `<div style="font-size:12px;color:#666;margin-bottom:14px">Editors: ${m.editors.join(", ")}</div>` : ""}
      ${blocksHtml}
      <div style="margin-top:16px;font-size:12px;color:#666">${m.disclaimer ?? ""}</div>
      ${m.contactEmail ? `<div style="margin-top:8px;font-size:12px;color:#666">${m.contactEmail}</div>` : ""}
    </div>
  </div>
</body>
</html>`;
}

export function Builder() {
  const [state, setState] = useState<UndoState<Issue>>(() => initUndo(defaultIssue));
  const issue = state.present;

  const [preview, setPreview] = useState<PreviewMode>("desktop");
  const [selected, setSelected] = useState<{ sectionId: string; blockId: string } | null>(null);

  const errors = useMemo(() => validateIssue(issue), [issue]);

  useEffect(() => {
    const d = loadDraft();
    if (d?.json) {
      try {
        const loaded = migrateIssue(normalizeIssue(d.json));
        setState(initUndo(loaded));
      } catch {}
    }
  }, []);

  useEffect(() => {
    saveDraft(issue);
  }, [issue]);

  const updateIssue = (next: Issue) => setState(s => pushUndo(s, next));

  const addSection = () => {
    const sec: Section = { id: uid("sec"), title: "New Section", layout: "single", blocks: [] };
    updateIssue({ ...issue, sections: [...issue.sections, sec] });
  };

  const addBlock = (sectionId: string, type: Block["type"]) => {
    const blk: Block = { id: uid("blk"), type, data: {} };
    // seed defaults
    if (type === "text") blk.data = { heading: "Heading", body: parseMarkdown("Write here.") , _md: "Write here." };
    if (type === "article") blk.data = { title: "Title", source: "", href: "", summary: parseMarkdown("Summary here."), _md: "Summary here." };
    if (type === "ticker") blk.data = { items: ["Item 1", "Item 2"] };
    if (type === "image") blk.data = { assetId: issue.assets[0]?.id ?? "", caption: parseMarkdown("Caption (optional)."), _md: "Caption (optional)." };

    updateIssue({
      ...issue,
      sections: issue.sections.map(s => s.id === sectionId ? { ...s, blocks: [...s.blocks, blk] } : s)
    });
    setSelected({ sectionId, blockId: blk.id });
  };

  const removeBlock = (sectionId: string, blockId: string) => {
    updateIssue({
      ...issue,
      sections: issue.sections.map(s => s.id === sectionId ? { ...s, blocks: s.blocks.filter(b => b.id !== blockId) } : s)
    });
    if (selected?.blockId === blockId) setSelected(null);
  };

  const patchBlock = (sectionId: string, blockId: string, patch: any) => {
    updateIssue({
      ...issue,
      sections: issue.sections.map(s => {
        if (s.id !== sectionId) return s;
        return { ...s, blocks: s.blocks.map(b => b.id === blockId ? { ...b, data: { ...b.data, ...patch } } : b) };
      })
    });
  };

  const selectedBlock = useMemo(() => {
    if (!selected) return null;
    const s = issue.sections.find(x => x.id === selected.sectionId);
    const b = s?.blocks.find(x => x.id === selected.blockId);
    return s && b ? { section: s, block: b } : null;
  }, [issue, selected]);

  const width = preview === "desktop" ? 1100 : preview === "tablet" ? 820 : 420;

  const exportJson = () => downloadText("newsletter.json", JSON.stringify(issue, null, 2), "application/json");
  const exportEmail = () => downloadText("newsletter_email.html", issueToEmailHtml(issue), "text/html");

  const loadJsonFile = async (f: File | null) => {
    if (!f) return;
    const json = JSON.parse(await f.text());
    const loaded = migrateIssue(normalizeIssue(json));
    setState(initUndo(loaded));
    setSelected(null);
  };

  const reset = () => {
    clearDraft();
    setState(initUndo(defaultIssue));
    setSelected(null);
  };

  return (
    <div className="builder">
      <div className="topbar">
        <div className="brand">Builder</div>
        <button className="btn ghost" onClick={() => setState(s => undo(s))} disabled={!state.past.length}>Undo</button>
        <button className="btn ghost" onClick={() => setState(s => redo(s))} disabled={!state.future.length}>Redo</button>

        <div className="spacer" />

        <button className={preview === "desktop" ? "btn" : "btn ghost"} onClick={() => setPreview("desktop")}>Desktop</button>
        <button className={preview === "tablet" ? "btn" : "btn ghost"} onClick={() => setPreview("tablet")}>Tablet</button>
        <button className={preview === "phone" ? "btn" : "btn ghost"} onClick={() => setPreview("phone")}>Phone</button>

        <div className="spacer" />

        <button className="btn" onClick={exportJson}>Export JSON</button>
        <button className="btn ghost" onClick={exportEmail}>Export Email HTML</button>
        <label className="btn ghost">
          Load JSON
          <input type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => loadJsonFile(e.target.files?.[0] ?? null)} />
        </label>
        <button className="btn danger ghost" onClick={reset}>Reset</button>
      </div>

      {errors.length ? (
        <div className="err">
          <b>Schema warnings:</b> {errors.slice(0, 3).map(e => <span key={e.path}> {e.path}: {e.message} </span>)}
        </div>
      ) : null}

      <div className="main">
        <div className="left">
          <div className="panel">
            <div className="panel-title">Document</div>
            <div className="field">
              <label>Title</label>
              <input value={issue.meta.title} onChange={(e) => updateIssue({ ...issue, meta: { ...issue.meta, title: e.target.value } })} />
            </div>
            <div className="row">
              <div className="field">
                <label>Issue #</label>
                <input value={issue.meta.issueNumber} onChange={(e) => updateIssue({ ...issue, meta: { ...issue.meta, issueNumber: e.target.value } })} />
              </div>
              <div className="field">
                <label>Date</label>
                <input value={issue.meta.dateISO} onChange={(e) => updateIssue({ ...issue, meta: { ...issue.meta, dateISO: e.target.value } })} />
              </div>
            </div>

            <div className="row">
              <button className="btn ghost" onClick={addSection}>Add Section</button>
              <a className="btn ghost" href="/viewer">Viewer</a>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">Sections</div>
            {issue.sections.map((s) => (
              <div key={s.id} className="secRow">
                <input
                  className="secTitleInput"
                  value={s.title}
                  onChange={(e) => updateIssue({ ...issue, sections: issue.sections.map(x => x.id === s.id ? { ...x, title: e.target.value } : x) })}
                />
                <select
                  value={s.layout}
                  onChange={(e) => updateIssue({ ...issue, sections: issue.sections.map(x => x.id === s.id ? { ...x, layout: e.target.value as any } : x) })}
                >
                  <option value="single">Single</option>
                  <option value="twoColumn">Two-Column</option>
                </select>
                <div className="row">
                  {Object.keys(blockRegistry).map((t) => (
                    <button key={t} className="chip" onClick={() => addBlock(s.id, t as any)}>+ {t}</button>
                  ))}
                </div>
                <div className="blkList">
                  {s.blocks.map((b) => (
                    <button
                      key={b.id}
                      className={selected?.blockId === b.id ? "blkBtn active" : "blkBtn"}
                      onClick={() => setSelected({ sectionId: s.id, blockId: b.id })}
                    >
                      {b.type} <span className="muted">({b.id.slice(0, 6)})</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="center">
          <div className="previewWrap">
            <div className="previewFrame" style={{ width }}>
              <Renderer issue={issue} mode="edit" />
            </div>
          </div>
        </div>

        <div className="right">
          <div className="panel">
            <div className="panel-title">Inspector</div>
            {!selectedBlock ? (
              <div className="muted">Select a block to edit.</div>
            ) : (
              <Inspector
                sectionId={selectedBlock.section.id}
                block={selectedBlock.block}
                issue={issue}
                patch={(p) => patchBlock(selectedBlock.section.id, selectedBlock.block.id, p)}
                remove={() => removeBlock(selectedBlock.section.id, selectedBlock.block.id)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Inspector({ sectionId, block, issue, patch, remove }: { sectionId: string; block: Block; issue: Issue; patch: (p:any)=>void; remove: ()=>void }) {
  const d: any = block.data ?? {};
  if (block.type === "text") {
    return (
      <div>
        <div className="field">
          <label>Heading</label>
          <input value={String(d.heading ?? "")} onChange={(e) => patch({ heading: e.target.value })} />
        </div>
        <MdEditor
          label="Body (Markdown)"
          value={String(d._md ?? "")}
          onChange={(md) => patch({ _md: md, body: parseMarkdown(md) })}
        />
        <button className="btn danger ghost" onClick={remove}>Delete Block</button>
      </div>
    );
  }
  if (block.type === "article") {
    return (
      <div>
        <div className="field">
          <label>Title</label>
          <input value={String(d.title ?? "")} onChange={(e) => patch({ title: e.target.value })} />
        </div>
        <div className="field">
          <label>Source</label>
          <input value={String(d.source ?? "")} onChange={(e) => patch({ source: e.target.value })} />
        </div>
        <div className="field">
          <label>Link (href)</label>
          <input value={String(d.href ?? "")} onChange={(e) => patch({ href: e.target.value })} />
        </div>
        <MdEditor
          label="Summary (Markdown)"
          value={String(d._md ?? "")}
          onChange={(md) => patch({ _md: md, summary: parseMarkdown(md) })}
        />
        <button className="btn danger ghost" onClick={remove}>Delete Block</button>
      </div>
    );
  }
  if (block.type === "ticker") {
    const items: string[] = Array.isArray(d.items) ? d.items.map(String) : [];
    return (
      <div>
        <div className="field">
          <label>Items (one per line)</label>
          <textarea value={items.join("\n")} onChange={(e) => patch({ items: e.target.value.split(/\n+/).map(x=>x.trim()).filter(Boolean) })} />
        </div>
        <button className="btn danger ghost" onClick={remove}>Delete Block</button>
      </div>
    );
  }
  if (block.type === "image") {
    return (
      <div>
        <div className="field">
          <label>Asset</label>
          <select value={String(d.assetId ?? "")} onChange={(e) => patch({ assetId: e.target.value })}>
            <option value="">(none)</option>
            {issue.assets.map(a => <option key={a.id} value={a.id}>{a.id} — {a.src}</option>)}
          </select>
        </div>
        <MdEditor
          label="Caption (Markdown)"
          value={String(d._md ?? "")}
          onChange={(md) => patch({ _md: md, caption: parseMarkdown(md) })}
        />
        <button className="btn danger ghost" onClick={remove}>Delete Block</button>
      </div>
    );
  }
  return (
    <div>
      <div className="muted">No inspector for type: {block.type}</div>
      <button className="btn danger ghost" onClick={remove}>Delete Block</button>
    </div>
  );
}

function MdEditor({ label, value, onChange }: { label: string; value: string; onChange: (v:string)=>void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="## heading\n\nWrite text with **bold**, *italic*, `code`, [link](https://...)" />
      <div className="small muted">Stored as portable RichText AST for universal exports.</div>
    </div>
  );
}

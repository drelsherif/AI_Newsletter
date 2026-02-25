import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Renderer } from "../../renderer/Renderer";
import { defaultIssue } from "../../core/issue/defaults";
import { normalizeIssue } from "../../core/issue/normalize";
import { migrateIssue } from "../../core/issue/migrate";
import { validateIssue } from "../../core/issue/validate";
import type { Issue, Block, Section } from "../../core/issue/schema";
import { initUndo, pushUndo, undo, redo, type UndoState } from "../../core/storage/undoStack";
import { saveDraft, loadDraft, saveToLibrary, getLibrary, deleteFromLibrary } from "../../core/storage/library";
import { blockRegistry } from "../../renderer/blocks/registry";
import { parseMarkdown } from "../../core/richtext/parseMarkdown";
import { issueToEmailHtml } from "../../core/email/emailExport";

type PreviewMode = "mobile" | "tablet" | "desktop";
const PREVIEW_WIDTHS: Record<PreviewMode, number> = { mobile: 480, tablet: 768, desktop: 1100 };

function uid() {
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const BLOCK_DEFAULTS: Record<Block["type"], (issue: Issue) => Partial<Block["data"]>> = {
  text: () => ({
    heading: "New Heading",
    body: parseMarkdown("Write your content here."),
    _md: "Write your content here.",
    links: []
  }),
  article: () => ({
    title: "Article Title",
    source: "",
    href: "",
    summary: parseMarkdown("Article summary goes here."),
    _md: "Article summary goes here.",
    linkText: "Read more →"
  }),
  ticker: () => ({
    items: "First headline • Second item • Third announcement"
  }),
  image: (issue) => ({
    assetId: issue.assets[0]?.id ?? "",
    caption: parseMarkdown(""),
    _md: ""
  }),
  html: () => ({
    label: "Custom Block",
    html: `<div style="padding:20px;background:#f9fafb;border-radius:12px;text-align:center;font-family:system-ui,sans-serif">
  <p style="color:#374151;font-size:14px">Edit this HTML in the Inspector panel →</p>
</div>`
  }),
  divider: () => ({ style: "line" }),
  button: () => ({
    text: "Click Here",
    href: "https://example.com",
    color: "#4F7FFF",
    textColor: "#ffffff",
    align: "center"
  }),
  spacer: () => ({ height: 24 })
};

export function Builder() {
  const [state, setState] = useState<UndoState<Issue>>(() => {
    const draft = loadDraft();
    if (draft?.data) {
      try {
        return initUndo(migrateIssue(normalizeIssue(draft.data)));
      } catch {}
    }
    return initUndo(defaultIssue);
  });

  const [newsletterName, setNewsletterName] = useState<string>(() => {
    const draft = loadDraft();
    return draft?.name ?? "Untitled Newsletter";
  });

  const issue = state.present;
  const [preview, setPreview] = useState<PreviewMode>("mobile");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "info" | "error" } | null>(null);
  const toastTimer = useRef<number>(0);

  const errors = useMemo(() => validateIssue(issue), [issue]);

  // Autosave draft
  useEffect(() => {
    const t = setTimeout(() => saveDraft(newsletterName, issue), 800);
    return () => clearTimeout(t);
  }, [issue, newsletterName]);

  const showToast = useCallback((msg: string, type: "success" | "info" | "error" = "info") => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  const updateIssue = useCallback((next: Issue) => {
    setState(s => pushUndo(s, next));
  }, []);

  const undoAction = useCallback(() => setState(s => undo(s)), []);
  const redoAction = useCallback(() => setState(s => redo(s)), []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "z" && !e.shiftKey) { e.preventDefault(); undoAction(); }
      if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redoAction(); }
      if (mod && e.key === "s") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newsletterName, issue]);

  // ── SECTION / BLOCK OPERATIONS ──────────────────────

  const addSection = useCallback(() => {
    const sec: Section = { id: uid(), title: "New Section", layout: "single", blocks: [] };
    updateIssue({ ...issue, sections: [...issue.sections, sec] });
  }, [issue, updateIssue]);

  const deleteSection = useCallback((secId: string) => {
    updateIssue({ ...issue, sections: issue.sections.filter(s => s.id !== secId) });
    setSelectedId(id => {
      const sec = issue.sections.find(s => s.id === secId);
      if (sec?.blocks.some(b => b.id === id)) return null;
      return id;
    });
  }, [issue, updateIssue]);

  const updateSection = useCallback((secId: string, patch: Partial<Section>) => {
    updateIssue({
      ...issue,
      sections: issue.sections.map(s => s.id === secId ? { ...s, ...patch } : s)
    });
  }, [issue, updateIssue]);

  const moveSectionUp = useCallback((secId: string) => {
    const idx = issue.sections.findIndex(s => s.id === secId);
    if (idx <= 0) return;
    const secs = [...issue.sections];
    [secs[idx - 1], secs[idx]] = [secs[idx], secs[idx - 1]];
    updateIssue({ ...issue, sections: secs });
  }, [issue, updateIssue]);

  const moveSectionDown = useCallback((secId: string) => {
    const idx = issue.sections.findIndex(s => s.id === secId);
    if (idx >= issue.sections.length - 1) return;
    const secs = [...issue.sections];
    [secs[idx], secs[idx + 1]] = [secs[idx + 1], secs[idx]];
    updateIssue({ ...issue, sections: secs });
  }, [issue, updateIssue]);

  const addBlock = useCallback((sectionId: string, type: Block["type"]) => {
    const id = uid();
    const blk: Block = {
      id,
      type,
      label: blockRegistry[type]?.title ?? type,
      data: BLOCK_DEFAULTS[type]?.(issue) ?? {}
    };
    updateIssue({
      ...issue,
      sections: issue.sections.map(s =>
        s.id === sectionId ? { ...s, blocks: [...s.blocks, blk] } : s
      )
    });
    setSelectedId(id);
  }, [issue, updateIssue]);

  const deleteBlock = useCallback((sectionId: string, blockId: string) => {
    updateIssue({
      ...issue,
      sections: issue.sections.map(s =>
        s.id === sectionId ? { ...s, blocks: s.blocks.filter(b => b.id !== blockId) } : s
      )
    });
    setSelectedId(id => id === blockId ? null : id);
  }, [issue, updateIssue]);

  const patchBlock = useCallback((sectionId: string, blockId: string, patch: Record<string, any>) => {
    updateIssue({
      ...issue,
      sections: issue.sections.map(s =>
        s.id !== sectionId ? s : {
          ...s,
          blocks: s.blocks.map(b => b.id !== blockId ? b : { ...b, data: { ...b.data, ...patch } })
        }
      )
    });
  }, [issue, updateIssue]);

  const updateBlockLabel = useCallback((sectionId: string, blockId: string, label: string) => {
    updateIssue({
      ...issue,
      sections: issue.sections.map(s =>
        s.id !== sectionId ? s : {
          ...s,
          blocks: s.blocks.map(b => b.id !== blockId ? b : { ...b, label })
        }
      )
    });
  }, [issue, updateIssue]);

  const moveBlockUp = useCallback((secId: string, blockId: string) => {
    const sec = issue.sections.find(s => s.id === secId);
    if (!sec) return;
    const idx = sec.blocks.findIndex(b => b.id === blockId);
    if (idx <= 0) return;
    const blocks = [...sec.blocks];
    [blocks[idx - 1], blocks[idx]] = [blocks[idx], blocks[idx - 1]];
    updateIssue({ ...issue, sections: issue.sections.map(s => s.id === secId ? { ...s, blocks } : s) });
  }, [issue, updateIssue]);

  const moveBlockDown = useCallback((secId: string, blockId: string) => {
    const sec = issue.sections.find(s => s.id === secId);
    if (!sec) return;
    const idx = sec.blocks.findIndex(b => b.id === blockId);
    if (idx >= sec.blocks.length - 1) return;
    const blocks = [...sec.blocks];
    [blocks[idx], blocks[idx + 1]] = [blocks[idx + 1], blocks[idx]];
    updateIssue({ ...issue, sections: issue.sections.map(s => s.id === secId ? { ...s, blocks } : s) });
  }, [issue, updateIssue]);

  // ── SELECTED BLOCK ─────────────────────────────────
  const selectedContext = useMemo(() => {
    if (!selectedId) return null;
    for (const sec of issue.sections) {
      const blk = sec.blocks.find(b => b.id === selectedId);
      if (blk) return { section: sec, block: blk };
    }
    return null;
  }, [issue, selectedId]);

  // ── SAVE / EXPORT ───────────────────────────────────
  const handleSave = useCallback(() => {
    saveToLibrary(newsletterName, issue);
    showToast(`Saved "${newsletterName}"`, "success");
  }, [newsletterName, issue, showToast]);

  const exportJson = useCallback(() => {
    downloadText(`${newsletterName}.json`, JSON.stringify(issue, null, 2), "application/json");
    showToast("JSON exported", "success");
  }, [newsletterName, issue, showToast]);

  const exportHtml = useCallback(() => {
    downloadText(`${newsletterName}.html`, issueToEmailHtml(issue), "text/html");
    showToast("HTML exported", "success");
  }, [newsletterName, issue, showToast]);

  const importJson = useCallback(async (f: File | null) => {
    if (!f) return;
    try {
      const json = JSON.parse(await f.text());
      const loaded = migrateIssue(normalizeIssue(json));
      setState(initUndo(loaded));
      setSelectedId(null);
      showToast("Imported successfully", "success");
    } catch (e: any) {
      showToast("Import failed: " + (e?.message ?? e), "error");
    }
  }, [showToast]);

  const loadFromLibrary = useCallback((name: string) => {
    const lib = getLibrary();
    const entry = lib[name];
    if (!entry) return;
    try {
      const loaded = migrateIssue(normalizeIssue(entry.data));
      setState(initUndo(loaded));
      setNewsletterName(name);
      setSelectedId(null);
      setShowLibrary(false);
      showToast(`Loaded "${name}"`, "success");
    } catch {
      showToast("Failed to load newsletter", "error");
    }
  }, [showToast]);

  const resetNew = useCallback(() => {
    setState(initUndo(defaultIssue));
    setNewsletterName("Untitled Newsletter");
    setSelectedId(null);
    showToast("New newsletter created", "info");
  }, [showToast]);

  const previewWidth = PREVIEW_WIDTHS[preview];

  return (
    <div className="nf-builder">
      {/* ── TOPBAR ── */}
      <div className="nf-topbar">
        <div className="nf-brand">NewsForge</div>
        <div className="nf-sep" />

        <input
          className="nf-name-input"
          value={newsletterName}
          onChange={e => setNewsletterName(e.target.value)}
          title="Newsletter name (used when saving)"
        />

        <div className="nf-sep" />

        <div className="nf-tb-group">
          <button
            className="nf-btn nf-btn-ghost nf-btn-icon"
            onClick={undoAction}
            disabled={!state.past.length}
            title="Undo (Ctrl+Z)"
          >↩</button>
          <button
            className="nf-btn nf-btn-ghost nf-btn-icon"
            onClick={redoAction}
            disabled={!state.future.length}
            title="Redo (Ctrl+Y)"
          >↪</button>
        </div>

        <div className="nf-sep" />

        <div className="nf-tb-group">
          <div className="nf-tab-group">
            {(["mobile","tablet","desktop"] as PreviewMode[]).map(m => (
              <button
                key={m}
                className={`nf-tab-btn${preview === m ? " active" : ""}`}
                onClick={() => setPreview(m)}
              >
                {m === "mobile" ? "📱" : m === "tablet" ? "▭" : "🖥"} {m}
              </button>
            ))}
          </div>
        </div>

        <div className="nf-spacer" />

        <div className="nf-tb-group">
          {errors.length > 0 && (
            <span className="nf-err-badge" title={errors.map(e => `${e.path}: ${e.message}`).join("\n")}>
              ⚠ {errors.length}
            </span>
          )}
          <button className="nf-btn nf-btn-ghost" onClick={() => setShowLibrary(true)}>
            ☰ Library
          </button>
          <button className="nf-btn nf-btn-ghost" onClick={resetNew}>+ New</button>
          <button className="nf-btn nf-btn-primary" onClick={handleSave}>
            💾 Save
          </button>
          <button className="nf-btn nf-btn-success" onClick={exportHtml}>
            Export HTML
          </button>
          <button className="nf-btn nf-btn-ghost" onClick={exportJson}>Export JSON</button>
          <label className="nf-btn nf-btn-ghost" style={{ cursor: "pointer" }}>
            Import
            <input type="file" accept=".json" style={{ display: "none" }} onChange={e => importJson(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      </div>

      {/* ── WORKSPACE ── */}
      <div className="nf-workspace">

        {/* LEFT: Document + Sections */}
        <div className="nf-left">
          <LeftPanel
            issue={issue}
            updateIssue={updateIssue}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            addSection={addSection}
            deleteSection={deleteSection}
            updateSection={updateSection}
            moveSectionUp={moveSectionUp}
            moveSectionDown={moveSectionDown}
            addBlock={addBlock}
            deleteBlock={deleteBlock}
            moveBlockUp={moveBlockUp}
            moveBlockDown={moveBlockDown}
            updateBlockLabel={updateBlockLabel}
          />
        </div>

        {/* CENTER: Preview */}
        <div className="nf-center">
          <div className="nf-preview-toolbar">
            <span className="nf-toolbar-label">LIVE PREVIEW</span>
            <div className="nf-spacer" />
            <span className="nf-toolbar-dim">{previewWidth}px</span>
          </div>
          <div className="nf-preview-area">
            <div className="nf-preview-frame" style={{ width: previewWidth }}>
              <Renderer issue={issue} mode="edit" />
            </div>
          </div>
        </div>

        {/* RIGHT: Inspector */}
        <div className="nf-right">
          <div className="nf-panel">
            <div className="nf-panel-header">
              <span className="nf-panel-title">Inspector</span>
              {selectedContext && (
                <span className="nf-badge nf-badge-type">{selectedContext.block.type}</span>
              )}
            </div>
            {selectedContext ? (
              <Inspector
                section={selectedContext.section}
                block={selectedContext.block}
                issue={issue}
                patch={(p: Record<string, any>) => patchBlock(selectedContext.section.id, selectedContext.block.id, p)}
                updateLabel={(l: string) => updateBlockLabel(selectedContext.section.id, selectedContext.block.id, l)}
                remove={() => deleteBlock(selectedContext.section.id, selectedContext.block.id)}
              />
            ) : (
              <div className="nf-inspector-empty">
                <div className="nf-inspector-empty-icon">⬡</div>
                <div className="nf-inspector-empty-text">Select a block to edit its properties</div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Library Modal */}
      {showLibrary && (
        <LibraryModal
          onLoad={loadFromLibrary}
          onClose={() => setShowLibrary(false)}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`nf-toast nf-toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}

// ── LEFT PANEL ──────────────────────────────────────────
function LeftPanel({
  issue, updateIssue, selectedId, setSelectedId,
  addSection, deleteSection, updateSection, moveSectionUp, moveSectionDown,
  addBlock, deleteBlock, moveBlockUp, moveBlockDown, updateBlockLabel
}: any) {
  const updateMeta = (patch: Partial<Issue["meta"]>) =>
    updateIssue({ ...issue, meta: { ...issue.meta, ...patch } });
  const updateBrand = (patch: Partial<Issue["brand"]>) =>
    updateIssue({ ...issue, brand: { ...issue.brand, ...patch } });

  const [activeTab, setActiveTab] = useState<"document" | "sections">("document");

  return (
    <div className="nf-left-inner">
      <div className="nf-left-tabs">
        <button
          className={`nf-left-tab${activeTab === "document" ? " active" : ""}`}
          onClick={() => setActiveTab("document")}
        >Document</button>
        <button
          className={`nf-left-tab${activeTab === "sections" ? " active" : ""}`}
          onClick={() => setActiveTab("sections")}
        >Sections</button>
      </div>

      {activeTab === "document" && (
        <div className="nf-doc-panel">
          <div className="nf-panel-section">
            <div className="nf-section-label">META</div>
            <Field label="Newsletter Title">
              <input value={issue.meta.title} onChange={e => updateMeta({ title: e.target.value })} />
            </Field>
            <div className="nf-row-fields">
              <Field label="Issue #">
                <input value={issue.meta.issueNumber} onChange={e => updateMeta({ issueNumber: e.target.value })} />
              </Field>
              <Field label="Date">
                <input type="date" value={issue.meta.dateISO} onChange={e => updateMeta({ dateISO: e.target.value })} />
              </Field>
            </div>
            <Field label="Organization">
              <input value={issue.meta.orgName ?? ""} onChange={e => updateMeta({ orgName: e.target.value })} placeholder="Your org" />
            </Field>
            <Field label="Department">
              <input value={issue.meta.department ?? ""} onChange={e => updateMeta({ department: e.target.value })} placeholder="Optional" />
            </Field>
            <Field label="Editors (comma-separated)">
              <input
                value={(issue.meta.editors ?? []).join(", ")}
                onChange={e => updateMeta({ editors: e.target.value.split(",").map((x: string) => x.trim()).filter(Boolean) })}
                placeholder="Jane Doe, John Smith"
              />
            </Field>
          </div>

          <div className="nf-panel-section">
            <div className="nf-section-label">BRANDING</div>
            <Field label="Logo Text">
              <input value={issue.brand.logoText ?? ""} onChange={e => updateBrand({ logoText: e.target.value })} placeholder="ACME WEEKLY" />
            </Field>
            <div className="nf-row-fields">
              <Field label="Primary Color">
                <ColorField
                  value={issue.brand.primaryColor}
                  onChange={v => updateBrand({ primaryColor: v })}
                />
              </Field>
              <Field label="Accent Color">
                <ColorField
                  value={issue.brand.accentColor}
                  onChange={v => updateBrand({ accentColor: v })}
                />
              </Field>
            </div>
          </div>

          <div className="nf-panel-section">
            <div className="nf-section-label">FOOTER</div>
            <Field label="Contact Email">
              <input value={issue.meta.contactEmail ?? ""} onChange={e => updateMeta({ contactEmail: e.target.value })} placeholder="editor@example.com" />
            </Field>
            <Field label="Disclaimer">
              <textarea
                value={issue.meta.disclaimer ?? ""}
                onChange={e => updateMeta({ disclaimer: e.target.value })}
                placeholder="© 2025 Your Organization."
                style={{ minHeight: 56 }}
              />
            </Field>
          </div>
        </div>
      )}

      {activeTab === "sections" && (
        <div className="nf-sections-panel">
          <div className="nf-sections-toolbar">
            <button className="nf-btn nf-btn-ghost nf-btn-sm" onClick={addSection}>+ Add Section</button>
          </div>
          {issue.sections.length === 0 && (
            <div className="nf-empty-state">No sections yet. Click "+ Add Section" above.</div>
          )}
          {issue.sections.map((sec: Section, si: number) => (
            <SectionItem
              key={sec.id}
              section={sec}
              sectionIndex={si}
              totalSections={issue.sections.length}
              selectedId={selectedId}
              onSelectBlock={setSelectedId}
              onUpdate={(patch: Partial<Section>) => updateSection(sec.id, patch)}
              onDelete={() => deleteSection(sec.id)}
              onMoveUp={() => moveSectionUp(sec.id)}
              onMoveDown={() => moveSectionDown(sec.id)}
              onAddBlock={(type: Block["type"]) => addBlock(sec.id, type)}
              onDeleteBlock={(blockId: string) => deleteBlock(sec.id, blockId)}
              onMoveBlockUp={(blockId: string) => moveBlockUp(sec.id, blockId)}
              onMoveBlockDown={(blockId: string) => moveBlockDown(sec.id, blockId)}
              onUpdateBlockLabel={(blockId: string, label: string) => updateBlockLabel(sec.id, blockId, label)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionItem({ section, sectionIndex, totalSections, selectedId, onSelectBlock, onUpdate, onDelete, onMoveUp, onMoveDown, onAddBlock, onDeleteBlock, onMoveBlockUp, onMoveBlockDown, onUpdateBlockLabel }: any) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="nf-section-item">
      <div className="nf-section-head">
        <button className="nf-sec-toggle" onClick={() => setExpanded(e => !e)}>
          {expanded ? "▾" : "▸"}
        </button>
        <input
          className="nf-sec-title-input"
          value={section.title}
          onChange={e => onUpdate({ title: e.target.value })}
          placeholder="Section title (optional)"
        />
        <select
          className="nf-sec-layout"
          value={section.layout}
          onChange={e => onUpdate({ layout: e.target.value })}
          title="Layout"
        >
          <option value="single">1 col</option>
          <option value="twoColumn">2 col</option>
          <option value="threeColumn">3 col</option>
        </select>
        <div className="nf-sec-actions">
          <button
            className="nf-icon-btn"
            onClick={onMoveUp}
            disabled={sectionIndex === 0}
            title="Move up"
          >↑</button>
          <button
            className="nf-icon-btn"
            onClick={onMoveDown}
            disabled={sectionIndex === totalSections - 1}
            title="Move down"
          >↓</button>
          <button className="nf-icon-btn nf-icon-btn-danger" onClick={onDelete} title="Delete section">✕</button>
        </div>
      </div>

      {expanded && (
        <>
          <div className="nf-add-block-row">
            {(Object.keys(blockRegistry) as Block["type"][]).map(type => (
              <button
                key={type}
                className="nf-add-chip"
                onClick={() => onAddBlock(type)}
                title={blockRegistry[type].description}
              >
                + {blockRegistry[type].title}
              </button>
            ))}
          </div>

          <div className="nf-block-list">
            {section.blocks.length === 0 && (
              <div className="nf-block-empty">Add blocks above ↑</div>
            )}
            {section.blocks.map((blk: Block, bi: number) => (
              <BlockItem
                key={blk.id}
                block={blk}
                blockIndex={bi}
                totalBlocks={section.blocks.length}
                isSelected={selectedId === blk.id}
                onSelect={() => onSelectBlock(blk.id)}
                onDelete={() => onDeleteBlock(blk.id)}
                onMoveUp={() => onMoveBlockUp(blk.id)}
                onMoveDown={() => onMoveBlockDown(blk.id)}
                onUpdateLabel={(label: string) => onUpdateBlockLabel(blk.id, label)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BlockItem({ block, blockIndex, totalBlocks, isSelected, onSelect, onDelete, onMoveUp, onMoveDown, onUpdateLabel }: any) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelVal, setLabelVal] = useState(block.label ?? block.type);

  const badgeClass = `nf-block-badge nf-badge-${block.type}`;

  return (
    <div
      className={`nf-block-item${isSelected ? " selected" : ""}`}
      onClick={onSelect}
    >
      <span className={badgeClass}>{block.type}</span>
      {editingLabel ? (
        <input
          className="nf-block-label-input"
          value={labelVal}
          autoFocus
          onChange={e => setLabelVal(e.target.value)}
          onBlur={() => { onUpdateLabel(labelVal); setEditingLabel(false); }}
          onKeyDown={e => { if (e.key === "Enter") { onUpdateLabel(labelVal); setEditingLabel(false); } }}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span
          className="nf-block-label"
          onDoubleClick={e => { e.stopPropagation(); setEditingLabel(true); }}
          title="Double-click to rename"
        >
          {block.label || block.type}
        </span>
      )}
      <div className="nf-block-actions" onClick={e => e.stopPropagation()}>
        <button className="nf-icon-btn" onClick={onMoveUp} disabled={blockIndex === 0} title="Move up">↑</button>
        <button className="nf-icon-btn" onClick={onMoveDown} disabled={blockIndex === totalBlocks - 1} title="Move down">↓</button>
        <button className="nf-icon-btn nf-icon-btn-danger" onClick={onDelete} title="Delete block">✕</button>
      </div>
    </div>
  );
}

// ── INSPECTOR ────────────────────────────────────────────
function Inspector({ section, block, issue, patch, updateLabel, remove }: any) {
  const d = block.data as any;

  return (
    <div className="nf-inspector">
      <Field label="Block Label">
        <input
          value={block.label ?? block.type}
          onChange={e => updateLabel(e.target.value)}
          placeholder="Friendly display name"
        />
      </Field>

      <div className="nf-inspector-divider" />

      {block.type === "text" && (
        <TextInspector d={d} patch={patch} />
      )}
      {block.type === "article" && (
        <ArticleInspector d={d} patch={patch} />
      )}
      {block.type === "ticker" && (
        <TickerInspector d={d} patch={patch} />
      )}
      {block.type === "image" && (
        <ImageInspector d={d} patch={patch} issue={issue} />
      )}
      {block.type === "html" && (
        <HtmlInspector d={d} patch={patch} />
      )}
      {block.type === "divider" && (
        <DividerInspector d={d} patch={patch} />
      )}
      {block.type === "button" && (
        <ButtonInspector d={d} patch={patch} />
      )}
      {block.type === "spacer" && (
        <SpacerInspector d={d} patch={patch} />
      )}

      <div className="nf-inspector-divider" />
      <button className="nf-btn nf-btn-danger nf-btn-sm" onClick={remove} style={{ width: "100%" }}>
        Delete Block
      </button>
    </div>
  );
}

function TextInspector({ d, patch }: any) {
  const [md, setMd] = useState(d._md ?? "");
  useEffect(() => { setMd(d._md ?? ""); }, [d._md]);

  return (
    <>
      <Field label="Heading">
        <input value={d.heading ?? ""} onChange={e => patch({ heading: e.target.value })} placeholder="Optional heading" />
      </Field>
      <Field label="Body (Markdown)">
        <textarea
          value={md}
          onChange={e => { setMd(e.target.value); patch({ _md: e.target.value, body: parseMarkdown(e.target.value) }); }}
          placeholder={"## Heading\n\nWrite **bold**, *italic*, `code`\n\n- List item\n- Another item\n\n[Link text](https://example.com)"}
        />
        <span className="nf-hint">Supports **bold**, *italic*, `code`, [links](url), ## headings, lists</span>
      </Field>
      <Field label="Links (one per line: [Label](url))">
        <textarea
          value={Array.isArray(d.links) ? d.links.map((l: any) => `[${l.label}](${l.href})`).join("\n") : ""}
          onChange={e => {
            const links = e.target.value.split("\n").map(line => {
              const m = line.trim().match(/^\[(.+?)\]\((.+?)\)$/);
              return m ? { label: m[1], href: m[2] } : null;
            }).filter(Boolean);
            patch({ links });
          }}
          placeholder="[Read More](https://example.com)"
          style={{ minHeight: 64 }}
        />
        <span className="nf-hint">Each line: [Label](https://url.com)</span>
      </Field>
    </>
  );
}

function ArticleInspector({ d, patch }: any) {
  const [md, setMd] = useState(d._md ?? "");
  useEffect(() => { setMd(d._md ?? ""); }, [d._md]);

  return (
    <>
      <Field label="Article Title">
        <input value={d.title ?? ""} onChange={e => patch({ title: e.target.value })} placeholder="Article headline" />
      </Field>
      <Field label="Source / Publisher">
        <input value={d.source ?? ""} onChange={e => patch({ source: e.target.value })} placeholder="TechCrunch • 2025" />
      </Field>
      <Field label="Article URL">
        <input
          value={d.href ?? ""}
          onChange={e => patch({ href: e.target.value })}
          placeholder="https://example.com/article"
          type="url"
        />
      </Field>
      <Field label="Summary (Markdown)">
        <textarea
          value={md}
          onChange={e => { setMd(e.target.value); patch({ _md: e.target.value, summary: parseMarkdown(e.target.value) }); }}
          placeholder="One-paragraph summary of the article..."
        />
      </Field>
      <Field label="Link Text">
        <input value={d.linkText ?? "Read more →"} onChange={e => patch({ linkText: e.target.value })} placeholder="Read more →" />
      </Field>
    </>
  );
}

function TickerInspector({ d, patch }: any) {
  const raw = Array.isArray(d.items) ? d.items.join(" • ") : (d.items ?? "");
  return (
    <Field label="Items (separate with •)">
      <textarea
        value={raw}
        onChange={e => patch({ items: e.target.value })}
        placeholder="First item • Second item • Third item"
        style={{ minHeight: 64 }}
      />
      <span className="nf-hint">Separate items with a bullet character •</span>
    </Field>
  );
}

function ImageInspector({ d, patch, issue }: any) {
  const [md, setMd] = useState(d._md ?? "");
  useEffect(() => { setMd(d._md ?? ""); }, [d._md]);

  return (
    <>
      <Field label="Image Asset">
        <select value={d.assetId ?? ""} onChange={e => patch({ assetId: e.target.value })}>
          <option value="">(no asset selected)</option>
          {issue.assets.map((a: any) => (
            <option key={a.id} value={a.id}>{a.id} — {a.src}</option>
          ))}
        </select>
        {issue.assets.length === 0 && (
          <span className="nf-hint">No assets yet. Assets are added via JSON import.</span>
        )}
      </Field>
      <Field label="Image URL (direct)">
        <input
          value={d.src ?? ""}
          onChange={e => patch({ src: e.target.value })}
          placeholder="https://example.com/image.jpg"
          type="url"
        />
        <span className="nf-hint">Or use a direct URL instead of an asset</span>
      </Field>
      <Field label="Caption (Markdown)">
        <textarea
          value={md}
          onChange={e => { setMd(e.target.value); patch({ _md: e.target.value, caption: parseMarkdown(e.target.value) }); }}
          placeholder="Optional image caption..."
          style={{ minHeight: 52 }}
        />
      </Field>
    </>
  );
}

function HtmlInspector({ d, patch }: any) {
  return (
    <>
      <Field label="Block Label / Description">
        <input
          value={d.label ?? ""}
          onChange={e => patch({ label: e.target.value })}
          placeholder="e.g. Announcement Banner"
        />
      </Field>
      <Field label="HTML Code">
        <textarea
          value={d.html ?? ""}
          onChange={e => patch({ html: e.target.value })}
          className="nf-code-textarea"
          placeholder={"<div style=\"padding:20px\">\n  Your custom HTML here\n</div>"}
        />
        <span className="nf-hint">⚠ Raw HTML — renders directly in preview and email export. Use inline styles for email compatibility.</span>
      </Field>
    </>
  );
}

function DividerInspector({ d, patch }: any) {
  return (
    <>
      <Field label="Style">
        <select value={d.style ?? "line"} onChange={e => patch({ style: e.target.value })}>
          <option value="line">Line</option>
          <option value="dots">Dots (···)</option>
          <option value="space">Blank Space</option>
        </select>
      </Field>
      {d.style === "space" && (
        <Field label="Height (px)">
          <input
            type="number"
            min={4}
            max={120}
            value={d.height ?? 24}
            onChange={e => patch({ height: Number(e.target.value) })}
          />
        </Field>
      )}
    </>
  );
}

function ButtonInspector({ d, patch }: any) {
  return (
    <>
      <Field label="Button Text">
        <input value={d.text ?? "Click Here"} onChange={e => patch({ text: e.target.value })} />
      </Field>
      <Field label="URL">
        <input value={d.href ?? ""} onChange={e => patch({ href: e.target.value })} placeholder="https://example.com" type="url" />
      </Field>
      <div className="nf-row-fields">
        <Field label="Background Color">
          <ColorField value={d.color ?? "#4F7FFF"} onChange={v => patch({ color: v })} />
        </Field>
        <Field label="Text Color">
          <ColorField value={d.textColor ?? "#ffffff"} onChange={v => patch({ textColor: v })} />
        </Field>
      </div>
      <Field label="Alignment">
        <select value={d.align ?? "center"} onChange={e => patch({ align: e.target.value })}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </Field>
    </>
  );
}

function SpacerInspector({ d, patch }: any) {
  return (
    <Field label="Height (px)">
      <input
        type="number"
        min={4}
        max={120}
        value={d.height ?? 24}
        onChange={e => patch({ height: Number(e.target.value) })}
      />
    </Field>
  );
}

// ── SHARED FIELD COMPONENTS ──────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="nf-field">
      <label className="nf-field-label">{label}</label>
      {children}
    </div>
  );
}

function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hex, setHex] = useState(value);
  useEffect(() => setHex(value), [value]);

  return (
    <div className="nf-color-row">
      <input
        type="color"
        value={hex}
        onChange={e => { setHex(e.target.value); onChange(e.target.value); }}
        className="nf-color-picker"
      />
      <input
        value={hex}
        onChange={e => {
          setHex(e.target.value);
          if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value);
        }}
        placeholder="#4F7FFF"
        className="nf-color-hex"
      />
    </div>
  );
}

// ── LIBRARY MODAL ────────────────────────────────────────
function LibraryModal({ onLoad, onClose, showToast }: any) {
  const lib = getLibrary();
  const entries = Object.values(lib).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );

  const handleDelete = (name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      deleteFromLibrary(name);
      showToast(`Deleted "${name}"`, "info");
    }
  };

  return (
    <div className="nf-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="nf-modal">
        <div className="nf-modal-header">
          <span className="nf-modal-title">Newsletter Library</span>
          <button className="nf-icon-btn" onClick={onClose}>✕</button>
        </div>
        {entries.length === 0 ? (
          <div className="nf-empty-state" style={{ padding: "24px", textAlign: "center" }}>
            No saved newsletters yet.<br />
            <small>Click <strong>Save</strong> in the toolbar to store your work.</small>
          </div>
        ) : (
          <div className="nf-library-grid">
            {entries.map(entry => (
              <div key={entry.name} className="nf-library-card">
                <div className="nf-library-card-name">{entry.name}</div>
                <div className="nf-library-card-date">
                  {new Date(entry.savedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </div>
                <div className="nf-library-card-actions">
                  <button className="nf-btn nf-btn-primary nf-btn-sm" onClick={() => onLoad(entry.name)}>Load</button>
                  <button className="nf-btn nf-btn-danger nf-btn-sm" onClick={() => handleDelete(entry.name)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="nf-modal-footer">
          <button className="nf-btn nf-btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

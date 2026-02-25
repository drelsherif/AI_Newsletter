import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Renderer } from "../../renderer/Renderer";
import { defaultIssue } from "../../core/issue/defaults";
import { normalizeIssue } from "../../core/issue/normalize";
import { migrateIssue } from "../../core/issue/migrate";
import { validateIssue } from "../../core/issue/validate";
import type { Issue, Block, Section, FeedSource } from "../../core/issue/schema";
import {
  initUndo,
  pushUndo,
  undo,
  redo,
  type UndoState,
} from "../../core/storage/undoStack";
import {
  saveDraft,
  loadDraft,
  saveToLibrary,
  getLibrary,
  deleteFromLibrary,
} from "../../core/storage/library";
import { blockRegistry } from "../../renderer/blocks/registry";
import { parseMarkdown } from "../../core/richtext/parseMarkdown";
import { issueToEmailHtml } from "../../core/email/emailExport";
import { readImageFile } from "../../core/assets/imageUpload";
import { normalizeUrl } from "../../core/utils/normalizeUrl";
import {
  fetchFeed,
  fetchAllFeeds,
} from "../../core/rss/fetchFeed";
import { PRESET_FEEDS } from "../../core/rss/types";

// ── TYPES ────────────────────────────────────────────────────────────────────

type PreviewMode = "mobile" | "tablet" | "desktop";
type LeftTab = "settings" | "sections" | "feeds";

const PREVIEW_WIDTHS: Record<PreviewMode, number> = {
  mobile: 480,
  tablet: 720,
  desktop: 1040,
};

// ── UTILITIES ────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const LOGO_HTML_TEMPLATES = [
  {
    label: "Gradient Text",
    html: `<div style="font-family:'Syne',Arial,sans-serif;font-size:22px;font-weight:800;background:linear-gradient(135deg,#4F7FFF,#7C3AED);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-0.5px">NEWSLETTER</div>`,
  },
  {
    label: "Dot + Bold",
    html: `<div style="font-family:'Syne',Arial,sans-serif;font-size:18px;font-weight:800;color:#fff;display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:#4F7FFF;display:inline-block;flex-shrink:0"></span>NEURO BRIEF</div>`,
  },
  {
    label: "Monospace Brackets",
    html: `<div style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;color:#fff;letter-spacing:2px">[ AI WEEKLY ]</div>`,
  },
  {
    label: "Serif + Accent Line",
    html: `<div style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#fff;border-bottom:3px solid #4F7FFF;padding-bottom:6px;display:inline-block">The Dispatch</div>`,
  },
  {
    label: "Animated Shimmer",
    html: `<style>.nf-logo-shimmer{background:linear-gradient(90deg,rgba(255,255,255,0.4) 0%,rgba(255,255,255,0.9) 40%,rgba(255,255,255,0.4) 80%);background-size:200% 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 2.5s infinite linear}@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}</style><div class="nf-logo-shimmer" style="font-family:'Syne',Arial,sans-serif;font-size:20px;font-weight:800;letter-spacing:1px">NEURAL DIGEST</div>`,
  },
];

// ── BLOCK DEFAULTS ───────────────────────────────────────────────────────────

const BLOCK_DEFAULTS: Record<Block["type"], (issue: Issue) => Record<string, unknown>> = {
  text: () => ({
    heading: "New Heading",
    body: parseMarkdown("Write your content here."),
    _md: "Write your content here.",
    links: [],
  }),
  article: () => ({
    title: "Article Title",
    source: "",
    href: "",
    summary: parseMarkdown("Article summary goes here."),
    _md: "Article summary goes here.",
    linkText: "Read more →",
  }),

  spotlight: () => ({
    badge: "Spotlight",
    kicker: "Featured this issue",
    title: "Spotlight Headline",
    source: "",
    href: "",
    imageSrc: "",
    imageAlt: "",
    takeaways: parseMarkdown("**Why it matters:**\n- Point one\n- Point two"),
    _takeawaysMd: "**Why it matters:**\n- Point one\n- Point two",
    myView: parseMarkdown("**My take:**\nAdd your perspective here."),
    _myViewMd: "**My take:**\nAdd your perspective here.",
    linkText: "Read full article →",
  }),
  articlePair: () => ({
    left: {
      title: "Article A",
      source: "",
      href: "",
      summary: parseMarkdown("Summary A..."),
      _md: "Summary A...",
      linkText: "Read more →",
    },
    right: {
      title: "Article B",
      source: "",
      href: "",
      summary: parseMarkdown("Summary B..."),
      _md: "Summary B...",
      linkText: "Read more →",
    },
  }),
  ticker: () => ({
    items: "First headline • Second item • Third announcement",
  }),
  image: () => ({
    src: "",
    alt: "",
    href: "",
    caption: parseMarkdown(""),
    _md: "",
  }),
  html: () => ({
    label: "Custom Block",
    html: `<div style="padding:20px;background:#f9fafb;border-radius:12px;text-align:center;font-family:system-ui,sans-serif">\n  <p style="color:#374151;font-size:14px">Edit this HTML in the Inspector →</p>\n</div>`,
  }),
  divider: () => ({ style: "line" }),
  button: () => ({
    text: "Click Here",
    href: "https://example.com",
    color: "#4F7FFF",
    textColor: "#ffffff",
    align: "center",
  }),
  spacer: () => ({ height: 24 }),
  linkList: () => ({
    title: "Quick Links",
    items: [
      { label: "Add a link…", href: "https://example.com", meta: "Optional note" },
    ],
  }),
  governance: () => ({
    badge: "Governance / Legal",
    title: "Regulatory update",
    body: parseMarkdown("Write a short governance/legal note with links."),
    _md: "Write a short governance/legal note with links.",
  }),
  sbarp: () => ({
    title: "SBAR-P",
    situation: parseMarkdown("Situation…"),
    _situationMd: "Situation…",
    background: parseMarkdown("Background…"),
    _backgroundMd: "Background…",
    assessment: parseMarkdown("Assessment…"),
    _assessmentMd: "Assessment…",
    recommendation: parseMarkdown("Recommendation…"),
    _recommendationMd: "Recommendation…",
    prompt: parseMarkdown("Paste the prompt you used (or want readers to try)."),
    _promptMd: "Paste the prompt you used (or want readers to try).",
  }),
  prompt: () => ({
    title: "Prompt like a Rockstar",
    template: parseMarkdown("**Template:**\nYou are…\nTask…\nConstraints…\nOutput format…"),
    _templateMd: "**Template:**\nYou are…\nTask…\nConstraints…\nOutput format…",
    good: parseMarkdown("A strong, specific prompt example."),
    _goodMd: "A strong, specific prompt example.",
    bad: parseMarkdown("A vague prompt example."),
    _badMd: "A vague prompt example.",
    tips: parseMarkdown("- Make it specific\n- Ask for structure\n- Include constraints"),
    _tipsMd: "- Make it specific\n- Ask for structure\n- Include constraints",
  }),
  term: () => ({
    term: "Agentic Workflow",
    definition: parseMarkdown("Define the term in 1–2 sentences."),
    _definitionMd: "Define the term in 1–2 sentences.",
    why: parseMarkdown("Explain why it matters clinically / operationally."),
    _whyMd: "Explain why it matters clinically / operationally.",
  }),
  history: () => ({
    title: "AI History",
    body: parseMarkdown("A quick timeline nugget."),
    _md: "A quick timeline nugget.",
  }),
  humor: () => ({
    title: "AI Humor",
    body: parseMarkdown("A one-liner or short meme caption."),
    _md: "A one-liner or short meme caption.",
  }),
  rss: () => ({
    feedIds: [],
    maxArticles: 10,
    layout: "list",
  }),
};

// ── MAIN BUILDER ─────────────────────────────────────────────────────────────

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
  const [leftTab, setLeftTab] = useState<LeftTab>("sections");
  const [showLibrary, setShowLibrary] = useState(false);
  const [showBlockPicker, setShowBlockPicker] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "info" | "error";
  } | null>(null);
  const toastTimer = useRef<number>(0);

  const errors = useMemo(() => validateIssue(issue), [issue]);

  useEffect(() => {
    const t = setTimeout(() => saveDraft(newsletterName, issue), 800);
    return () => clearTimeout(t);
  }, [issue, newsletterName]);

  const showToast = useCallback(
    (msg: string, type: "success" | "info" | "error" = "info") => {
      setToast({ msg, type });
      clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 3000);
    },
    []
  );

  const updateIssue = useCallback(
    (next: Issue) => setState((s) => pushUndo(s, next)),
    []
  );
  const undoAction = useCallback(() => setState((s) => undo(s)), []);
  const redoAction = useCallback(() => setState((s) => redo(s)), []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoAction();
      }
      if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redoAction();
      }
      if (mod && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── SECTION OPS ───────────────────────────────────────────────────────────

  const addSection = useCallback(() => {
    const sec: Section = {
      id: uid(),
      title: "New Section",
      layout: "single",
      blocks: [],
    };
    updateIssue({ ...issue, sections: [...issue.sections, sec] });
  }, [issue, updateIssue]);

  const deleteSection = useCallback(
    (secId: string) => {
      updateIssue({
        ...issue,
        sections: issue.sections.filter((s) => s.id !== secId),
      });
      setSelectedId((id) => {
        const sec = issue.sections.find((s) => s.id === secId);
        if (sec?.blocks.some((b) => b.id === id)) return null;
        return id;
      });
    },
    [issue, updateIssue]
  );

  const updateSection = useCallback(
    (secId: string, patch: Partial<Section>) => {
      updateIssue({
        ...issue,
        sections: issue.sections.map((s) =>
          s.id === secId ? { ...s, ...patch } : s
        ),
      });
    },
    [issue, updateIssue]
  );

  const moveSectionUp = useCallback(
    (secId: string) => {
      const idx = issue.sections.findIndex((s) => s.id === secId);
      if (idx <= 0) return;
      const secs = [...issue.sections];
      [secs[idx - 1], secs[idx]] = [secs[idx], secs[idx - 1]];
      updateIssue({ ...issue, sections: secs });
    },
    [issue, updateIssue]
  );

  const moveSectionDown = useCallback(
    (secId: string) => {
      const idx = issue.sections.findIndex((s) => s.id === secId);
      if (idx >= issue.sections.length - 1) return;
      const secs = [...issue.sections];
      [secs[idx], secs[idx + 1]] = [secs[idx + 1], secs[idx]];
      updateIssue({ ...issue, sections: secs });
    },
    [issue, updateIssue]
  );

  // ── BLOCK OPS ─────────────────────────────────────────────────────────────

  const addBlock = useCallback(
    (sectionId: string, type: Block["type"]) => {
      const id = uid();
      const blk: Block = {
        id,
        type,
        label: blockRegistry[type]?.title ?? type,
        data: BLOCK_DEFAULTS[type]?.(issue) ?? {},
      };
      updateIssue({
        ...issue,
        sections: issue.sections.map((s) =>
          s.id === sectionId ? { ...s, blocks: [...s.blocks, blk] } : s
        ),
      });
      setSelectedId(id);
      setShowBlockPicker(null);
    },
    [issue, updateIssue]
  );

  const deleteBlock = useCallback(
    (sectionId: string, blockId: string) => {
      updateIssue({
        ...issue,
        sections: issue.sections.map((s) =>
          s.id === sectionId
            ? { ...s, blocks: s.blocks.filter((b) => b.id !== blockId) }
            : s
        ),
      });
      setSelectedId((id) => (id === blockId ? null : id));
    },
    [issue, updateIssue]
  );

  const patchBlock = useCallback(
    (sectionId: string, blockId: string, patch: Record<string, unknown>) => {
      updateIssue({
        ...issue,
        sections: issue.sections.map((s) =>
          s.id !== sectionId
            ? s
            : {
                ...s,
                blocks: s.blocks.map((b) =>
                  b.id !== blockId
                    ? b
                    : { ...b, data: { ...b.data, ...patch } }
                ),
              }
        ),
      });
    },
    [issue, updateIssue]
  );

  const updateBlockLabel = useCallback(
    (sectionId: string, blockId: string, label: string) => {
      updateIssue({
        ...issue,
        sections: issue.sections.map((s) =>
          s.id !== sectionId
            ? s
            : {
                ...s,
                blocks: s.blocks.map((b) =>
                  b.id !== blockId ? b : { ...b, label }
                ),
              }
        ),
      });
    },
    [issue, updateIssue]
  );

  const moveBlockUp = useCallback(
    (secId: string, blockId: string) => {
      const sec = issue.sections.find((s) => s.id === secId);
      if (!sec) return;
      const idx = sec.blocks.findIndex((b) => b.id === blockId);
      if (idx <= 0) return;
      const blocks = [...sec.blocks];
      [blocks[idx - 1], blocks[idx]] = [blocks[idx], blocks[idx - 1]];
      updateIssue({
        ...issue,
        sections: issue.sections.map((s) =>
          s.id === secId ? { ...s, blocks } : s
        ),
      });
    },
    [issue, updateIssue]
  );

  const moveBlockDown = useCallback(
    (secId: string, blockId: string) => {
      const sec = issue.sections.find((s) => s.id === secId);
      if (!sec) return;
      const idx = sec.blocks.findIndex((b) => b.id === blockId);
      if (idx >= sec.blocks.length - 1) return;
      const blocks = [...sec.blocks];
      [blocks[idx], blocks[idx + 1]] = [blocks[idx + 1], blocks[idx]];
      updateIssue({
        ...issue,
        sections: issue.sections.map((s) =>
          s.id === secId ? { ...s, blocks } : s
        ),
      });
    },
    [issue, updateIssue]
  );

  // ── FEED OPS ──────────────────────────────────────────────────────────────

  const updateFeed = useCallback(
    (feedId: string, patch: Partial<FeedSource>) => {
      updateIssue({
        ...issue,
        feeds: issue.feeds.map((f) =>
          f.id === feedId ? { ...f, ...patch } : f
        ),
      });
    },
    [issue, updateIssue]
  );

  const addFeed = useCallback(
    (url: string, name: string) => {
      if (!url.trim()) return;
      const newFeed: FeedSource = {
        id: uid(),
        url: url.trim(),
        name: name.trim() || url.trim(),
        maxArticles: 10,
        articles: [],
      };
      updateIssue({ ...issue, feeds: [...issue.feeds, newFeed] });
    },
    [issue, updateIssue]
  );

  const removeFeed = useCallback(
    (feedId: string) => {
      updateIssue({
        ...issue,
        feeds: issue.feeds.filter((f) => f.id !== feedId),
      });
    },
    [issue, updateIssue]
  );

  const fetchOneFeed = useCallback(
    async (feedId: string) => {
      const feed = issue.feeds.find((f) => f.id === feedId);
      if (!feed) return;
      updateFeed(feedId, { lastError: undefined });
      showToast(`Fetching "${feed.name}"…`, "info");
      const result = await fetchFeed(feed.url, feed.name, feed.id, feed.maxArticles);
      updateFeed(feedId, {
        articles: result.articles,
        lastFetchedAt: result.fetchedAt,
        lastError: result.error,
      });
      if (result.error) {
        showToast(`Error: ${result.error}`, "error");
      } else {
        showToast(`✓ ${result.articles.length} articles from "${feed.name}"`, "success");
      }
    },
    [issue, updateFeed, showToast]
  );

  const fetchAllFeedsAction = useCallback(async () => {
    if (issue.feeds.length === 0) {
      showToast("No feeds added yet.", "info");
      return;
    }
    showToast(`Fetching ${issue.feeds.length} feeds…`, "info");
    const results = await fetchAllFeeds(
      issue.feeds.map((f) => ({
        id: f.id,
        url: f.url,
        name: f.name,
        maxArticles: f.maxArticles,
      }))
    );
    const updatedFeeds = issue.feeds.map((f) => {
      const r = results.find((x) => x.feedId === f.id);
      if (!r) return f;
      return {
        ...f,
        articles: r.articles,
        lastFetchedAt: r.fetchedAt,
        lastError: r.error,
      };
    });
    updateIssue({ ...issue, feeds: updatedFeeds });
    const ok = results.filter((r) => !r.error).length;
    showToast(`Done — ${ok}/${results.length} feeds successful`, ok === results.length ? "success" : "info");
  }, [issue, updateIssue, showToast]);

  const addPresetFeed = useCallback(
    (preset: (typeof PRESET_FEEDS)[number]) => {
      if (issue.feeds.some((f) => f.id === preset.id)) return;
      const newFeed: FeedSource = {
        id: preset.id,
        url: preset.url,
        name: preset.name,
        maxArticles: 10,
        articles: [],
      };
      updateIssue({ ...issue, feeds: [...issue.feeds, newFeed] });
    },
    [issue, updateIssue]
  );

  // ── SELECTED BLOCK ────────────────────────────────────────────────────────

  const selectedContext = useMemo(() => {
    if (!selectedId) return null;
    for (const sec of issue.sections) {
      const blk = sec.blocks.find((b) => b.id === selectedId);
      if (blk) return { section: sec, block: blk };
    }
    return null;
  }, [issue, selectedId]);

  // ── SAVE / EXPORT ──────────────────────────────────────────────────────────

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
    showToast("Email HTML exported", "success");
  }, [newsletterName, issue, showToast]);

  const importJson = useCallback(
    async (f: File | null) => {
      if (!f) return;
      try {
        const json = JSON.parse(await f.text());
        const loaded = migrateIssue(normalizeIssue(json));
        setState(initUndo(loaded));
        setSelectedId(null);
        showToast("Imported successfully", "success");
      } catch (e: unknown) {
        showToast("Import failed: " + (e instanceof Error ? e.message : String(e)), "error");
      }
    },
    [showToast]
  );

  const loadFromLibrary = useCallback(
    (name: string) => {
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
    },
    [showToast]
  );

  const resetNew = useCallback(() => {
    setState(initUndo(defaultIssue));
    setNewsletterName("Untitled Newsletter");
    setSelectedId(null);
    showToast("New newsletter created", "info");
  }, [showToast]);

  const previewWidth = PREVIEW_WIDTHS[preview];

  return (
    <div className="nf-builder">
      {/* ── TOPBAR ─────────────────────────────────────────────────────── */}
      <div className="nf-topbar">
        <div className="nf-brand">NewsForge</div>
        <div className="nf-sep" />

        <input
          className="nf-name-input"
          value={newsletterName}
          onChange={(e) => setNewsletterName(e.target.value)}
          title="Newsletter name"
        />

        <div className="nf-sep" />

        <div className="nf-tb-group">
          <button
            className="nf-btn nf-btn-ghost nf-btn-icon"
            onClick={undoAction}
            disabled={!state.past.length}
            title="Undo (Ctrl+Z)"
          >
            ↩
          </button>
          <button
            className="nf-btn nf-btn-ghost nf-btn-icon"
            onClick={redoAction}
            disabled={!state.future.length}
            title="Redo (Ctrl+Y)"
          >
            ↪
          </button>
        </div>

        <div className="nf-sep" />

        <div className="nf-tab-group">
          {(["mobile", "tablet", "desktop"] as PreviewMode[]).map((m) => (
            <button
              key={m}
              className={`nf-tab-btn${preview === m ? " active" : ""}`}
              onClick={() => setPreview(m)}
            >
              {m === "mobile" ? "📱" : m === "tablet" ? "▭" : "🖥"} {m}
            </button>
          ))}
        </div>

        <div className="nf-spacer" />

        <div className="nf-tb-group">
          {errors.length > 0 && (
            <span
              className="nf-err-badge"
              title={errors.map((e) => `${e.path}: ${e.message}`).join("\n")}
            >
              ⚠ {errors.length}
            </span>
          )}
          <button
            className="nf-btn nf-btn-ghost"
            onClick={() => setShowLibrary(true)}
          >
            ☰ Library
          </button>
          <button className="nf-btn nf-btn-ghost" onClick={resetNew}>
            + New
          </button>
          <button className="nf-btn nf-btn-primary" onClick={handleSave}>
            💾 Save
          </button>
          <button className="nf-btn nf-btn-success" onClick={exportHtml}>
            Export HTML
          </button>
          <button className="nf-btn nf-btn-ghost" onClick={exportJson}>
            JSON
          </button>
          <label className="nf-btn nf-btn-ghost" style={{ cursor: "pointer" }}>
            Import
            <input
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={(e) => importJson(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      {/* ── WORKSPACE ──────────────────────────────────────────────────── */}
      <div className="nf-workspace">
        {/* LEFT */}
        <div className="nf-left">
          <LeftPanel
            issue={issue}
            updateIssue={updateIssue}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            leftTab={leftTab}
            setLeftTab={setLeftTab}
            addSection={addSection}
            deleteSection={deleteSection}
            updateSection={updateSection}
            moveSectionUp={moveSectionUp}
            moveSectionDown={moveSectionDown}
            deleteBlock={deleteBlock}
            moveBlockUp={moveBlockUp}
            moveBlockDown={moveBlockDown}
            updateBlockLabel={updateBlockLabel}
            setShowBlockPicker={setShowBlockPicker}
            // feeds
            addFeed={addFeed}
            removeFeed={removeFeed}
            updateFeed={updateFeed}
            fetchOneFeed={fetchOneFeed}
            fetchAllFeedsAction={fetchAllFeedsAction}
            addPresetFeed={addPresetFeed}
          />
        </div>

        {/* CENTER */}
        <div className="nf-center">
          <div className="nf-preview-toolbar">
            <span className="nf-toolbar-label">LIVE PREVIEW</span>
            <div className="nf-spacer" />
            <span className="nf-toolbar-dim">{previewWidth}px wide</span>
          </div>
          <div className="nf-preview-area">
            <div
              className="nf-preview-frame"
              style={{ width: previewWidth }}
            >
              <Renderer issue={issue} mode="edit" />
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="nf-right">
          <div className="nf-panel">
            <div className="nf-panel-header">
              <span className="nf-panel-title">Inspector</span>
              {selectedContext && (
                <span className="nf-badge nf-badge-type">
                  {selectedContext.block.type}
                </span>
              )}
            </div>
            {selectedContext ? (
              <Inspector
                section={selectedContext.section}
                block={selectedContext.block}
                issue={issue}
                patch={(p: Record<string, unknown>) =>
                  patchBlock(
                    selectedContext.section.id,
                    selectedContext.block.id,
                    p
                  )
                }
                updateLabel={(l: string) =>
                  updateBlockLabel(
                    selectedContext.section.id,
                    selectedContext.block.id,
                    l
                  )
                }
                remove={() =>
                  deleteBlock(
                    selectedContext.section.id,
                    selectedContext.block.id
                  )
                }
              />
            ) : (
              <div className="nf-inspector-empty">
                <div className="nf-inspector-empty-icon">⬡</div>
                <div className="nf-inspector-empty-text">
                  Select a block to edit its properties
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Block Picker Modal */}
      {showBlockPicker && (
        <BlockPickerModal
          sectionId={showBlockPicker}
          onAdd={addBlock}
          onClose={() => setShowBlockPicker(null)}
        />
      )}

      {/* Library Modal */}
      {showLibrary && (
        <LibraryModal
          onLoad={loadFromLibrary}
          onClose={() => setShowLibrary(false)}
          showToast={showToast}
        />
      )}

      {toast && (
        <div className={`nf-toast nf-toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}

// ── LEFT PANEL ───────────────────────────────────────────────────────────────

function LeftPanel({
  issue, updateIssue, selectedId, setSelectedId,
  leftTab, setLeftTab,
  addSection, deleteSection, updateSection, moveSectionUp, moveSectionDown,
  deleteBlock, moveBlockUp, moveBlockDown, updateBlockLabel,
  setShowBlockPicker,
  addFeed, removeFeed, updateFeed, fetchOneFeed, fetchAllFeedsAction, addPresetFeed,
}: any) {
  return (
    <div className="nf-left-inner">
      <div className="nf-left-tabs">
        <button
          className={`nf-left-tab${leftTab === "sections" ? " active" : ""}`}
          onClick={() => setLeftTab("sections")}
        >
          ▤ Sections
        </button>
        <button
          className={`nf-left-tab${leftTab === "settings" ? " active" : ""}`}
          onClick={() => setLeftTab("settings")}
        >
          ⚙ Settings
        </button>
        <button
          className={`nf-left-tab${leftTab === "feeds" ? " active" : ""}`}
          onClick={() => setLeftTab("feeds")}
        >
          📡 Feeds
        </button>
      </div>

      {leftTab === "settings" && (
        <SettingsPanel issue={issue} updateIssue={updateIssue} />
      )}
      {leftTab === "sections" && (
        <SectionsPanel
          issue={issue}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          addSection={addSection}
          deleteSection={deleteSection}
          updateSection={updateSection}
          moveSectionUp={moveSectionUp}
          moveSectionDown={moveSectionDown}
          deleteBlock={deleteBlock}
          moveBlockUp={moveBlockUp}
          moveBlockDown={moveBlockDown}
          updateBlockLabel={updateBlockLabel}
          setShowBlockPicker={setShowBlockPicker}
        />
      )}
      {leftTab === "feeds" && (
        <FeedsPanel
          issue={issue}
          addFeed={addFeed}
          removeFeed={removeFeed}
          updateFeed={updateFeed}
          fetchOneFeed={fetchOneFeed}
          fetchAllFeedsAction={fetchAllFeedsAction}
          addPresetFeed={addPresetFeed}
        />
      )}
    </div>
  );
}

// ── SETTINGS PANEL ────────────────────────────────────────────────────────────

function SettingsPanel({ issue, updateIssue }: any) {
  const updateMeta = (patch: Partial<Issue["meta"]>) =>
    updateIssue({ ...issue, meta: { ...issue.meta, ...patch } });
  const updateBrand = (patch: Partial<Issue["brand"]>) =>
    updateIssue({ ...issue, brand: { ...issue.brand, ...patch } });

  const logoMode: string = issue.brand.logoMode ?? "text";

  return (
    <div className="nf-settings-panel">
      <div className="nf-panel-section">
        <div className="nf-section-label">META</div>
        <Field label="Newsletter Title">
          <input
            value={issue.meta.title}
            onChange={(e) => updateMeta({ title: e.target.value })}
          />
        </Field>
        <div className="nf-row-fields">
          <Field label="Issue #">
            <input
              value={issue.meta.issueNumber}
              onChange={(e) => updateMeta({ issueNumber: e.target.value })}
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={issue.meta.dateISO}
              onChange={(e) => updateMeta({ dateISO: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Organization">
          <input
            value={issue.meta.orgName ?? ""}
            onChange={(e) => updateMeta({ orgName: e.target.value })}
            placeholder="Your org"
          />
        </Field>
        <Field label="Department">
          <input
            value={issue.meta.department ?? ""}
            onChange={(e) => updateMeta({ department: e.target.value })}
            placeholder="Optional"
          />
        </Field>
        <Field label="Editors (comma-separated)">
          <input
            value={(issue.meta.editors ?? []).join(", ")}
            onChange={(e) =>
              updateMeta({
                editors: e.target.value
                  .split(",")
                  .map((x: string) => x.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Jane Doe, John Smith"
          />
        </Field>
      </div>

      <div className="nf-panel-section">
        <div className="nf-section-label">LOGO</div>
        <div className="nf-logo-mode-tabs">
          {(["text", "image", "html"] as const).map((m) => (
            <button
              key={m}
              className={`nf-logo-tab${logoMode === m ? " active" : ""}`}
              onClick={() => updateBrand({ logoMode: m })}
            >
              {m === "text" ? "Aa Text" : m === "image" ? "⊡ Image" : "</> HTML"}
            </button>
          ))}
        </div>

        {logoMode === "text" && (
          <Field label="Logo Text">
            <input
              value={issue.brand.logoText ?? ""}
              onChange={(e) => updateBrand({ logoText: e.target.value })}
              placeholder="ACME WEEKLY"
            />
          </Field>
        )}

        {logoMode === "image" && (
          <LogoImageUploader
            value={issue.brand.logoUrl ?? ""}
            onChange={(url: string) => updateBrand({ logoUrl: url })}
          />
        )}

        {logoMode === "html" && (
          <LogoHtmlEditor
            value={issue.brand.logoHtml ?? ""}
            onChange={(html: string) => updateBrand({ logoHtml: html })}
          />
        )}
      </div>

      <div className="nf-panel-section">
        <div className="nf-section-label">BRANDING</div>
        <div className="nf-row-fields">
          <Field label="Primary Color">
            <ColorField
              value={issue.brand.primaryColor}
              onChange={(v: string) => updateBrand({ primaryColor: v })}
            />
          </Field>
          <Field label="Accent Color">
            <ColorField
              value={issue.brand.accentColor}
              onChange={(v: string) => updateBrand({ accentColor: v })}
            />
          </Field>
        </div>
      </div>

      <div className="nf-panel-section">
        <div className="nf-section-label">FOOTER</div>
        <Field label="Contact Email">
          <input
            value={issue.meta.contactEmail ?? ""}
            onChange={(e) => updateMeta({ contactEmail: e.target.value })}
            placeholder="editor@example.com"
          />
        </Field>
        <Field label="Disclaimer">
          <textarea
            value={issue.meta.disclaimer ?? ""}
            onChange={(e) => updateMeta({ disclaimer: e.target.value })}
            placeholder="© 2025 Your Organization."
            style={{ minHeight: 52 }}
          />
        </Field>
      </div>
    </div>
  );
}

function LogoImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [warning, setWarning] = useState<string>("");
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File) => {
    try {
      const result = await readImageFile(file);
      setWarning(result.warning ?? "");
      onChange(result.dataUrl);
    } catch (e: unknown) {
      setWarning(e instanceof Error ? e.message : "Upload failed");
    }
  };

  return (
    <div className="nf-field">
      <label
        className={`nf-upload-zone${dragging ? " dragging" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
      >
        {value ? (
          <div className="nf-upload-preview">
            <img src={value} alt="Logo preview" className="nf-logo-preview-img" />
            <span className="nf-upload-change">Click or drop to replace</span>
          </div>
        ) : (
          <div className="nf-upload-placeholder">
            <span className="nf-upload-icon">⊡</span>
            <span>Click or drop logo image</span>
            <span className="nf-hint">PNG, JPG, SVG, WebP</span>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </label>
      {warning && <span className="nf-hint nf-hint-warn">{warning}</span>}
      {value && (
        <button
          className="nf-btn nf-btn-danger nf-btn-sm"
          style={{ marginTop: 6 }}
          onClick={() => { onChange(""); setWarning(""); }}
        >
          Remove Logo
        </button>
      )}
    </div>
  );
}

function LogoHtmlEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  return (
    <div className="nf-field">
      <div className="nf-logo-templates">
        <span className="nf-hint" style={{ marginBottom: 6, display: "block" }}>Starter templates:</span>
        {LOGO_HTML_TEMPLATES.map((t) => (
          <button
            key={t.label}
            className="nf-btn nf-btn-ghost nf-btn-sm"
            style={{ marginBottom: 4, width: "100%", justifyContent: "flex-start" }}
            onClick={() => onChange(t.html)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <label className="nf-field-label" style={{ marginTop: 8 }}>Custom HTML</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="nf-code-textarea"
        style={{ minHeight: 100 }}
        placeholder="<div style='color:white;font-size:20px'>My Logo</div>"
      />
      <span className="nf-hint">⚠ Animated logos (CSS keyframes) are web-only — not email safe.</span>
    </div>
  );
}

// ── SECTIONS PANEL ────────────────────────────────────────────────────────────

function SectionsPanel({
  issue, selectedId, setSelectedId,
  addSection, deleteSection, updateSection, moveSectionUp, moveSectionDown,
  deleteBlock, moveBlockUp, moveBlockDown, updateBlockLabel, setShowBlockPicker,
}: any) {
  return (
    <div className="nf-sections-panel">
      <div className="nf-sections-toolbar">
        <button
          className="nf-btn nf-btn-primary nf-btn-sm"
          style={{ width: "100%" }}
          onClick={addSection}
        >
          + Add Section
        </button>
      </div>
      {issue.sections.length === 0 && (
        <div className="nf-empty-state" style={{ padding: "20px 16px" }}>
          No sections yet. Click "Add Section" to start building.
        </div>
      )}
      {issue.sections.map((sec: Section, si: number) => (
        <SectionCard
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
          onAddBlock={() => setShowBlockPicker(sec.id)}
          onDeleteBlock={(blockId: string) => deleteBlock(sec.id, blockId)}
          onMoveBlockUp={(blockId: string) => moveBlockUp(sec.id, blockId)}
          onMoveBlockDown={(blockId: string) => moveBlockDown(sec.id, blockId)}
          onUpdateBlockLabel={(blockId: string, label: string) => updateBlockLabel(sec.id, blockId, label)}
        />
      ))}
    </div>
  );
}

function SectionCard({
  section, sectionIndex, totalSections, selectedId, onSelectBlock,
  onUpdate, onDelete, onMoveUp, onMoveDown, onAddBlock,
  onDeleteBlock, onMoveBlockUp, onMoveBlockDown, onUpdateBlockLabel,
}: any) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="nf-section-card">
      <div className="nf-section-card-head">
        <button
          className="nf-sec-toggle"
          onClick={() => setExpanded((e: boolean) => !e)}
        >
          {expanded ? "▾" : "▸"}
        </button>
        <input
          className="nf-sec-title-input"
          value={section.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Section title (optional)"
        />
        <select
          className="nf-sec-layout"
          value={section.layout}
          onChange={(e) => onUpdate({ layout: e.target.value })}
          title="Column layout"
        >
          <option value="single">1 col</option>
          <option value="twoColumn">2 col</option>
          <option value="threeColumn">3 col</option>
        </select>
        <button
          className="nf-icon-btn"
          onClick={onMoveUp}
          disabled={sectionIndex === 0}
          title="Move up"
        >
          ↑
        </button>
        <button
          className="nf-icon-btn"
          onClick={onMoveDown}
          disabled={sectionIndex === totalSections - 1}
          title="Move down"
        >
          ↓
        </button>
        <button
          className="nf-icon-btn nf-icon-btn-danger"
          onClick={onDelete}
          title="Delete section"
        >
          ✕
        </button>
      </div>

      {expanded && (
        <div className="nf-section-card-body">
          <div className="nf-block-list">
            {section.blocks.length === 0 && (
              <div className="nf-block-empty">No blocks yet</div>
            )}
            {section.blocks.map((blk: Block, bi: number) => (
              <BlockRow
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
          <button
            className="nf-btn nf-btn-ghost nf-btn-sm nf-add-block-btn"
            onClick={onAddBlock}
          >
            + Add Block
          </button>
        </div>
      )}
    </div>
  );
}

function BlockRow({
  block, blockIndex, totalBlocks, isSelected,
  onSelect, onDelete, onMoveUp, onMoveDown, onUpdateLabel,
}: any) {
  const [editing, setEditing] = useState(false);
  const [labelVal, setLabelVal] = useState(block.label ?? block.type);

  return (
    <div
      className={`nf-block-row${isSelected ? " selected" : ""}`}
      data-type={block.type}
      onClick={onSelect}
    >
      <span className={`nf-block-badge nf-badge-${block.type}`}>
        {blockRegistry[block.type as Block["type"]]?.icon ?? "?"}
      </span>
      {editing ? (
        <input
          className="nf-block-label-input"
          value={labelVal}
          autoFocus
          onChange={(e) => setLabelVal(e.target.value)}
          onBlur={() => { onUpdateLabel(labelVal); setEditing(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") { onUpdateLabel(labelVal); setEditing(false); } }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="nf-block-label"
          onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
          title="Double-click to rename"
        >
          {block.label || block.type}
        </span>
      )}
      <div
        className="nf-block-actions"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="nf-icon-btn"
          onClick={onMoveUp}
          disabled={blockIndex === 0}
        >
          ↑
        </button>
        <button
          className="nf-icon-btn"
          onClick={onMoveDown}
          disabled={blockIndex === totalBlocks - 1}
        >
          ↓
        </button>
        <button
          className="nf-icon-btn nf-icon-btn-danger"
          onClick={onDelete}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── FEEDS PANEL ───────────────────────────────────────────────────────────────

function FeedsPanel({
  issue, addFeed, removeFeed, updateFeed,
  fetchOneFeed, fetchAllFeedsAction, addPresetFeed,
}: any) {
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [fetching, setFetching] = useState<Record<string, boolean>>({});

  const doFetchOne = async (feedId: string) => {
    setFetching((f) => ({ ...f, [feedId]: true }));
    await fetchOneFeed(feedId);
    setFetching((f) => ({ ...f, [feedId]: false }));
  };

  const [fetchingAll, setFetchingAll] = useState(false);
  const doFetchAll = async () => {
    setFetchingAll(true);
    await fetchAllFeedsAction();
    setFetchingAll(false);
  };

  const activeFeedIds = new Set(issue.feeds.map((f: FeedSource) => f.id));

  function feedAge(iso?: string): string {
    if (!iso) return "";
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 2) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="nf-feeds-panel">
      <div className="nf-feeds-header">
        <button
          className="nf-btn nf-btn-primary nf-btn-sm"
          onClick={doFetchAll}
          disabled={fetchingAll || issue.feeds.length === 0}
          style={{ width: "100%" }}
        >
          {fetchingAll ? "⟳ Fetching all…" : `⟳ Fetch All (${issue.feeds.length} feeds)`}
        </button>
      </div>

      <div className="nf-feeds-section-label">PRESET FEEDS</div>
      {PRESET_FEEDS.map((preset) => {
        const active = activeFeedIds.has(preset.id);
        const feed = issue.feeds.find((f: FeedSource) => f.id === preset.id);
        return (
          <div key={preset.id} className={`nf-feed-item${active ? " active" : ""}`}>
            <div className="nf-feed-item-main">
              <button
                className={`nf-feed-toggle${active ? " on" : ""}`}
                onClick={() =>
                  active ? removeFeed(preset.id) : addPresetFeed(preset)
                }
                title={active ? "Remove feed" : "Add feed"}
              >
                {active ? "✓" : "+"}
              </button>
              <div className="nf-feed-info">
                <div className="nf-feed-name">{preset.name}</div>
                {active && feed && (
                  <div className="nf-feed-status">
                    {feed.lastError ? (
                      <span className="nf-feed-err">✗ {feed.lastError.slice(0, 40)}</span>
                    ) : feed.articles.length > 0 ? (
                      <span className="nf-feed-ok">
                        ✓ {feed.articles.length} articles · {feedAge(feed.lastFetchedAt)}
                      </span>
                    ) : (
                      <span className="nf-feed-idle">Not fetched yet</span>
                    )}
                  </div>
                )}
              </div>
              {active && (
                <button
                  className="nf-btn nf-btn-ghost nf-btn-sm"
                  onClick={() => doFetchOne(preset.id)}
                  disabled={fetching[preset.id]}
                >
                  {fetching[preset.id] ? "…" : "Fetch"}
                </button>
              )}
            </div>
            {active && (
              <div className="nf-feed-max-row">
                <span className="nf-hint">Articles:</span>
                {([5, 10, 15, 20] as const).map((n) => (
                  <button
                    key={n}
                    className={`nf-pill-btn${feed?.maxArticles === n ? " active" : ""}`}
                    onClick={() =>
                      updateFeed(preset.id, { maxArticles: n })
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {issue.feeds.filter((f: FeedSource) => !PRESET_FEEDS.some((p) => p.id === f.id))
        .length > 0 && (
        <>
          <div className="nf-feeds-section-label" style={{ marginTop: 12 }}>
            CUSTOM FEEDS
          </div>
          {issue.feeds
            .filter((f: FeedSource) => !PRESET_FEEDS.some((p) => p.id === f.id))
            .map((feed: FeedSource) => (
              <div key={feed.id} className="nf-feed-item active">
                <div className="nf-feed-item-main">
                  <div className="nf-feed-info" style={{ flex: 1 }}>
                    <div className="nf-feed-name">{feed.name || feed.url}</div>
                    <div className="nf-feed-status">
                      {feed.lastError ? (
                        <span className="nf-feed-err">✗ {feed.lastError.slice(0, 40)}</span>
                      ) : feed.articles.length > 0 ? (
                        <span className="nf-feed-ok">
                          ✓ {feed.articles.length} · {feedAge(feed.lastFetchedAt)}
                        </span>
                      ) : (
                        <span className="nf-feed-idle">Not fetched yet</span>
                      )}
                    </div>
                  </div>
                  <button
                    className="nf-btn nf-btn-ghost nf-btn-sm"
                    onClick={() => doFetchOne(feed.id)}
                    disabled={fetching[feed.id]}
                  >
                    {fetching[feed.id] ? "…" : "Fetch"}
                  </button>
                  <button
                    className="nf-icon-btn nf-icon-btn-danger"
                    onClick={() => removeFeed(feed.id)}
                  >
                    ✕
                  </button>
                </div>
                <div className="nf-feed-max-row">
                  <span className="nf-hint">Articles:</span>
                  {([5, 10, 15, 20] as const).map((n) => (
                    <button
                      key={n}
                      className={`nf-pill-btn${feed.maxArticles === n ? " active" : ""}`}
                      onClick={() => updateFeed(feed.id, { maxArticles: n })}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </>
      )}

      <div className="nf-feeds-section-label" style={{ marginTop: 16 }}>
        ADD CUSTOM FEED
      </div>
      <div className="nf-panel-section" style={{ paddingTop: 0 }}>
        <Field label="Feed URL (RSS or Atom)">
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            type="url"
          />
        </Field>
        <Field label="Display Name">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="My Feed"
          />
        </Field>
        <button
          className="nf-btn nf-btn-primary nf-btn-sm"
          style={{ width: "100%" }}
          onClick={() => {
            addFeed(newUrl, newName);
            setNewUrl("");
            setNewName("");
          }}
          disabled={!newUrl.trim()}
        >
          + Add Feed
        </button>
      </div>
    </div>
  );
}

// ── INSPECTOR ─────────────────────────────────────────────────────────────────

function Inspector({ section: _sec, block, issue, patch, updateLabel, remove }: any) {
  const d = block.data as Record<string, unknown>;

  return (
    <div className="nf-inspector">
      <Field label="Block Label">
        <input
          value={block.label ?? block.type}
          onChange={(e) => updateLabel(e.target.value)}
          placeholder="Friendly display name"
        />
      </Field>

      <div className="nf-inspector-divider" />

      {block.type === "text" && <TextInspector d={d} patch={patch} />}
      {block.type === "article" && <ArticleInspector d={d} patch={patch} />}
      {block.type === "ticker" && <TickerInspector d={d} patch={patch} />}
      {block.type === "image" && <ImageInspector d={d} patch={patch} />}
      {block.type === "html" && <HtmlInspector d={d} patch={patch} />}
      {block.type === "divider" && <DividerInspector d={d} patch={patch} />}
      {block.type === "button" && <ButtonInspector d={d} patch={patch} />}
      {block.type === "spacer" && <SpacerInspector d={d} patch={patch} />}
      {block.type === "rss" && <RssInspector d={d} patch={patch} issue={issue} />}
{block.type === "linkList" && <LinkListInspector d={d} patch={patch} />}
{block.type === "governance" && <GovernanceInspector d={d} patch={patch} />}
{block.type === "sbarp" && <SbarpInspector d={d} patch={patch} />}
{block.type === "prompt" && <PromptInspector d={d} patch={patch} />}
{block.type === "term" && <TermInspector d={d} patch={patch} />}
{block.type === "history" && <HistoryInspector d={d} patch={patch} />}
{block.type === "humor" && <HumorInspector d={d} patch={patch} />}

      <div className="nf-inspector-divider" />
      <button
        className="nf-btn nf-btn-danger nf-btn-sm"
        onClick={remove}
        style={{ width: "100%" }}
      >
        Delete Block
      </button>
    </div>
  );
}

function TextInspector({ d, patch }: { d: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const [md, setMd] = useState((d._md as string) ?? "");
  useEffect(() => { setMd((d._md as string) ?? ""); }, [d._md]);
  return (
    <>
      <Field label="Heading">
        <input
          value={(d.heading as string) ?? ""}
          onChange={(e) => patch({ heading: e.target.value })}
          placeholder="Optional heading"
        />
      </Field>
      <Field label="Body (Markdown)">
        <textarea
          value={md}
          onChange={(e) => {
            setMd(e.target.value);
            patch({ _md: e.target.value, body: parseMarkdown(e.target.value) });
          }}
          placeholder={"## Heading\n\nWrite **bold**, *italic*, `code`\n\n- List item\n\n[Link text](https://url.com)"}
        />
        <span className="nf-hint">**bold** *italic* `code` [link](url) ## heading - list</span>
      </Field>
      <Field label="Buttons (one per line: [Label](url))">
        <textarea
          value={
            Array.isArray(d.links)
              ? (d.links as Array<{label:string;href:string}>).map((l) => `[${l.label}](${l.href})`).join("\n")
              : ""
          }
          onChange={(e) => {
            const links = e.target.value
              .split("\n")
              .map((line) => {
                const m = line.trim().match(/^\[(.+?)\]\((.+?)\)$/);
                return m ? { label: m[1], href: m[2] } : null;
              })
              .filter(Boolean);
            patch({ links });
          }}
          placeholder="[Read More](https://example.com)"
          style={{ minHeight: 52 }}
        />
        <span className="nf-hint">Each line: [Button Label](https://url.com)</span>
      </Field>
    </>
  );
}

function ArticleInspector({ d, patch }: { d: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const [md, setMd] = useState((d._md as string) ?? "");
  useEffect(() => { setMd((d._md as string) ?? ""); }, [d._md]);
  return (
    <>
      <Field label="Article Title">
        <input
          value={(d.title as string) ?? ""}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Article headline"
        />
      </Field>
      <Field label="Source / Publisher">
        <input
          value={(d.source as string) ?? ""}
          onChange={(e) => patch({ source: e.target.value })}
          placeholder="TechCrunch • 2025"
        />
      </Field>
      <Field label="Article URL">
        <input
          value={(d.href as string) ?? ""}
          onChange={(e) => patch({ href: e.target.value })}
          onBlur={(e) => patch({ href: normalizeUrl(e.target.value) })}
          placeholder="https://example.com/article or www.example.com"
          type="url"
        />
      </Field>
      <Field label="Summary (Markdown)">
        <textarea
          value={md}
          onChange={(e) => {
            setMd(e.target.value);
            patch({ _md: e.target.value, summary: parseMarkdown(e.target.value) });
          }}
          placeholder="One-paragraph summary…"
        />
      </Field>
      <Field label="Link Text">
        <input
          value={(d.linkText as string) ?? "Read more →"}
          onChange={(e) => patch({ linkText: e.target.value })}
          placeholder="Read more →"
        />
      </Field>
    </>
  );
}

function TickerInspector({ d, patch }: { d: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const raw = Array.isArray(d.items)
    ? (d.items as string[]).join(" • ")
    : ((d.items as string) ?? "");

  const scroll = (d.scroll as boolean) ?? true;
  const speed = (d.speed as string) ?? "medium";

  return (
    <>
      <Field label="Items (separate with •)">
        <textarea
          value={raw}
          onChange={(e) => patch({ items: e.target.value })}
          placeholder="First item • Second item • Third item"
          style={{ minHeight: 72 }}
        />
        <span className="nf-hint">Separate each item with a bullet character •</span>
      </Field>

      <Field label="Scroll">
        <label className="nf-inline">
          <input
            type="checkbox"
            checked={scroll}
            onChange={(e) => patch({ scroll: e.target.checked })}
          />
          <span>Enable scrolling ticker (viewer/web)</span>
        </label>
        <span className="nf-hint">Email export renders a static ticker (no animations).</span>
      </Field>

      <Field label="Speed">
        <select value={speed} onChange={(e) => patch({ speed: e.target.value })}>
          <option value="slow">Slow</option>
          <option value="medium">Medium</option>
          <option value="fast">Fast</option>
        </select>
      </Field>
    </>
  );
}

function ImageInspector({ d, patch }: { d: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const [mdCap, setMdCap] = useState((d._md as string) ?? "");
  const [warning, setWarning] = useState("");
  const [dragging, setDragging] = useState(false);
  useEffect(() => { setMdCap((d._md as string) ?? ""); }, [d._md]);

  const handleFile = async (file: File) => {
    try {
      const result = await readImageFile(file);
      setWarning(result.warning ?? "");
      patch({ src: result.dataUrl, width: result.width, height: result.height });
    } catch (e: unknown) {
      setWarning(e instanceof Error ? e.message : "Upload failed");
    }
  };

  return (
    <>
      <div className="nf-field">
        <label className="nf-field-label">Image</label>
        <label
          className={`nf-upload-zone${dragging ? " dragging" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
        >
          {d.src ? (
            <div className="nf-upload-preview">
              <img
                src={d.src as string}
                alt="preview"
                style={{ maxHeight: 80, maxWidth: "100%", borderRadius: 6, objectFit: "contain" }}
              />
              <span className="nf-upload-change">Click or drop to replace</span>
            </div>
          ) : (
            <div className="nf-upload-placeholder">
              <span className="nf-upload-icon">⊡</span>
              <span>Click or drop image</span>
              <span className="nf-hint">PNG, JPG, WebP, GIF, SVG</span>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </label>
        {warning && <span className="nf-hint nf-hint-warn">{warning}</span>}
      </div>
      <Field label="Or enter image URL">
        <input
          value={typeof d.src === "string" && !d.src.startsWith("data:") ? d.src : ""}
          onChange={(e) => patch({ src: e.target.value })}
          placeholder="https://example.com/image.jpg"
          type="url"
        />
      </Field>
      <Field label="Alt text">
        <input
          value={(d.alt as string) ?? ""}
          onChange={(e) => patch({ alt: e.target.value })}
          placeholder="Describe the image"
        />
      </Field>
      <Field label="Link URL (makes image clickable)">
        <input
          value={(d.href as string) ?? ""}
          onChange={(e) => patch({ href: e.target.value })}
          onBlur={(e) => patch({ href: normalizeUrl(e.target.value) })}
          placeholder="https://example.com or www.example.com"
          type="url"
        />
      </Field>
      <Field label="Caption (Markdown)">
        <textarea
          value={mdCap}
          onChange={(e) => {
            setMdCap(e.target.value);
            patch({ _md: e.target.value, caption: parseMarkdown(e.target.value) });
          }}
          placeholder="Optional image caption"
          style={{ minHeight: 48 }}
        />
      </Field>
      {d.src && (
        <button
          className="nf-btn nf-btn-danger nf-btn-sm"
          style={{ width: "100%" }}
          onClick={() => patch({ src: "", alt: "", href: "" })}
        >
          Remove Image
        </button>
      )}
    </>
  );
}

function HtmlInspector({ d, patch }: { d: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <Field label="Block Label">
        <input
          value={(d.label as string) ?? ""}
          onChange={(e) => patch({ label: e.target.value })}
          placeholder="e.g. Announcement Banner"
        />
      </Field>
      <Field label="HTML Code">
        <textarea
          value={(d.html as string) ?? ""}
          onChange={(e) => patch({ html: e.target.value })}
          className="nf-code-textarea"
          placeholder={"<div style=\"padding:20px\">\n  Your HTML here\n</div>"}
          style={{ minHeight: 180 }}
        />
        <span className="nf-hint">Use inline styles for email compatibility.</span>
      </Field>
    </>
  );
}

function DividerInspector({ d, patch }: { d: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <Field label="Style">
        <select
          value={(d.style as string) ?? "line"}
          onChange={(e) => patch({ style: e.target.value })}
        >
          <option value="line">Line</option>
          <option value="dots">Dots (· · ·)</option>
          <option value="space">Blank Space</option>
        </select>
      </Field>
      {(d.style as string) === "space" && (
        <Field label="Height (px)">
          <input
            type="number"
            min={4}
            max={120}
            value={(d.height as number) ?? 24}
            onChange={(e) => patch({ height: Number(e.target.value) })}
          />
        </Field>
      )}
    </>
  );
}

function ButtonInspector({ d, patch }: { d: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <Field label="Button Text">
        <input
          value={(d.text as string) ?? "Click Here"}
          onChange={(e) => patch({ text: e.target.value })}
        />
      </Field>
      <Field label="URL">
        <input
          value={(d.href as string) ?? ""}
          onChange={(e) => patch({ href: e.target.value })}
          onBlur={(e) => patch({ href: normalizeUrl(e.target.value) })}
          placeholder="https://example.com or www.example.com"
          type="url"
        />
      </Field>
      <div className="nf-row-fields">
        <Field label="Background">
          <ColorField
            value={(d.color as string) ?? "#4F7FFF"}
            onChange={(v: string) => patch({ color: v })}
          />
        </Field>
        <Field label="Text Color">
          <ColorField
            value={(d.textColor as string) ?? "#ffffff"}
            onChange={(v: string) => patch({ textColor: v })}
          />
        </Field>
      </div>
      <Field label="Alignment">
        <select
          value={(d.align as string) ?? "center"}
          onChange={(e) => patch({ align: e.target.value })}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </Field>
    </>
  );
}

function SpacerInspector({ d, patch }: { d: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  return (
    <Field label="Height (px)">
      <input
        type="number"
        min={4}
        max={120}
        value={(d.height as number) ?? 24}
        onChange={(e) => patch({ height: Number(e.target.value) })}
      />
    </Field>
  );
}

function RssInspector({ d, patch, issue }: { d: Record<string, unknown>; patch: (p: Record<string, unknown>) => void; issue: Issue }) {
  const feedIds = Array.isArray(d.feedIds) ? (d.feedIds as string[]) : [];
  const allFeedArticles = issue.feeds.flatMap((f) => f.articles).length;

  return (
    <>
      <Field label="Source Feeds">
        {issue.feeds.length === 0 ? (
          <div className="nf-hint" style={{ padding: "8px 0" }}>
            No feeds added yet. Go to the <strong>Feeds</strong> tab to add feeds.
          </div>
        ) : (
          <div className="nf-feed-checkboxes">
            {issue.feeds.map((f) => (
              <label key={f.id} className="nf-feed-checkbox-row">
                <input
                  type="checkbox"
                  style={{ width: "auto", marginRight: 6 }}
                  checked={feedIds.length === 0 || feedIds.includes(f.id)}
                  onChange={(e) => {
                    if (feedIds.length === 0) {
                      // "all" mode — switching one off means we explicitly list others
                      const allIds = issue.feeds.map((x) => x.id);
                      const next = e.target.checked
                        ? allIds
                        : allIds.filter((id) => id !== f.id);
                      patch({ feedIds: next.length === issue.feeds.length ? [] : next });
                    } else {
                      const next = e.target.checked
                        ? [...feedIds, f.id]
                        : feedIds.filter((id) => id !== f.id);
                      patch({ feedIds: next.length === issue.feeds.length ? [] : next });
                    }
                  }}
                />
                <span className="nf-feed-checkbox-name">{f.name || f.url}</span>
                <span className="nf-hint" style={{ marginLeft: "auto" }}>
                  {f.articles.length}
                </span>
              </label>
            ))}
          </div>
        )}
        <span className="nf-hint">
          {feedIds.length === 0 ? "All feeds selected" : `${feedIds.length} feed(s) selected`}
          {" · "}{allFeedArticles} total articles available
        </span>
      </Field>
      <Field label="Max Articles to Show">
        <div className="nf-pill-row">
          {([5, 10, 15, 20] as const).map((n) => (
            <button
              key={n}
              className={`nf-pill-btn${((d.maxArticles as number) || 10) === n ? " active" : ""}`}
              onClick={() => patch({ maxArticles: n })}
            >
              {n}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Layout">
        <select
          value={(d.layout as string) ?? "list"}
          onChange={(e) => patch({ layout: e.target.value })}
        >
          <option value="list">List (title + summary)</option>
          <option value="compact">Compact (title only)</option>
          <option value="grid">Grid (card layout)</option>
        </select>
      </Field>
    </>
  );
}

function SpotlightInspector({ d, patch }: { d: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const [whyMd, setWhyMd] = useState((d._takeawaysMd as string) ?? "");
  const [myMd, setMyMd] = useState((d._myViewMd as string) ?? "");
  useEffect(() => { setWhyMd((d._takeawaysMd as string) ?? ""); }, [d._takeawaysMd]);
  useEffect(() => { setMyMd((d._myViewMd as string) ?? ""); }, [d._myViewMd]);

  return (
    <>
      <Field label="Badge">
        <input value={(d.badge as string) ?? ""} onChange={(e) => patch({ badge: e.target.value })} placeholder="Spotlight" />
      </Field>
      <Field label="Kicker (optional)">
        <input value={(d.kicker as string) ?? ""} onChange={(e) => patch({ kicker: e.target.value })} placeholder="Featured this issue" />
      </Field>
      <Field label="Title">
        <input value={(d.title as string) ?? ""} onChange={(e) => patch({ title: e.target.value })} placeholder="Spotlight headline" />
      </Field>
      <Field label="Source">
        <input value={(d.source as string) ?? ""} onChange={(e) => patch({ source: e.target.value })} placeholder="Journal / Publisher" />
      </Field>
      <Field label="URL">
        <input
          value={(d.href as string) ?? ""}
          onChange={(e) => patch({ href: e.target.value })}
          onBlur={(e) => patch({ href: normalizeUrl(e.target.value) })}
          placeholder="https://..."
          type="url"
        />
      </Field>
      <Field label="Image URL (optional)">
        <input value={(d.imageSrc as string) ?? ""} onChange={(e) => patch({ imageSrc: e.target.value })} placeholder="https://.../image.png" />
        <span className="nf-hint">Tip: you can also use the Image block if you want a standalone image.</span>
      </Field>

      <Field label="Why it matters (Markdown)">
        <textarea
          value={whyMd}
          onChange={(e) => {
            setWhyMd(e.target.value);
            patch({ _takeawaysMd: e.target.value, takeaways: parseMarkdown(e.target.value) });
          }}
          placeholder="- Point one\n- Point two"
        />
      </Field>

      <Field label="My take (Markdown)">
        <textarea
          value={myMd}
          onChange={(e) => {
            setMyMd(e.target.value);
            patch({ _myViewMd: e.target.value, myView: parseMarkdown(e.target.value) });
          }}
          placeholder="Your clinical/operational take..."
        />
      </Field>

      <Field label="Link text">
        <input value={(d.linkText as string) ?? ""} onChange={(e) => patch({ linkText: e.target.value })} placeholder="Read full article →" />
      </Field>
    </>
  );
}

function ArticleCardInspector({ a, onPatch, title }: { a: any; onPatch: (p: any) => void; title: string }) {
  const [md, setMd] = useState((a?._md as string) ?? "");
  useEffect(() => { setMd((a?._md as string) ?? ""); }, [a?._md]);
  return (
    <div className="nf-subcard">
      <div className="nf-subcard-title">{title}</div>
      <Field label="Title">
        <input value={(a?.title as string) ?? ""} onChange={(e) => onPatch({ title: e.target.value })} />
      </Field>
      <Field label="Source">
        <input value={(a?.source as string) ?? ""} onChange={(e) => onPatch({ source: e.target.value })} />
      </Field>
      <Field label="URL">
        <input
          value={(a?.href as string) ?? ""}
          onChange={(e) => onPatch({ href: e.target.value })}
          onBlur={(e) => onPatch({ href: normalizeUrl(e.target.value) })}
          placeholder="https://..."
          type="url"
        />
      </Field>
      <Field label="Summary (Markdown)">
        <textarea
          value={md}
          onChange={(e) => {
            setMd(e.target.value);
            onPatch({ _md: e.target.value, summary: parseMarkdown(e.target.value) });
          }}
        />
      </Field>
      <Field label="Link text">
        <input value={(a?.linkText as string) ?? ""} onChange={(e) => onPatch({ linkText: e.target.value })} placeholder="Read more →" />
      </Field>
    </div>
  );
}

function ArticlePairInspector({ d, patch }: { d: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const left = (d.left as any) ?? {};
  const right = (d.right as any) ?? {};

  const patchSide = (side: "left" | "right", p: any) => {
    const cur = (side === "left" ? left : right) || {};
    patch({ [side]: { ...cur, ...p } });
  };

  return (
    <>
      <ArticleCardInspector a={left} onPatch={(p) => patchSide("left", p)} title="Left Article" />
      <ArticleCardInspector a={right} onPatch={(p) => patchSide("right", p)} title="Right Article" />
    </>
  );
}

function LinkListInspector({ d, patch }: { d: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const title = (d.title as string) ?? "";
  const raw = Array.isArray(d.items)
    ? (d.items as any[]).map((it) => {
        const meta = it.meta ? ` | ${it.meta}` : "";
        return `${it.label || ""} -> ${it.href || ""}${meta}`.trim();
      }).join("\n")
    : "";

  return (
    <>
      <Field label="Title (optional)">
        <input value={title} onChange={(e) => patch({ title: e.target.value })} placeholder="Northwell News / Quick Reads" />
      </Field>
      <Field label="Items (one per line: Label -> URL | optional meta)">
        <textarea
          value={raw}
          onChange={(e) => {
            const items = e.target.value.split("\n").map((line) => {
              const s = line.trim();
              if (!s) return null;
              const parts = s.split("|");
              const left = parts[0].trim();
              const meta = parts.slice(1).join("|").trim();
              const m = left.match(/^(.*?)\s*->\s*(.+)$/);
              if (!m) return null;
              return { label: m[1].trim(), href: normalizeUrl(m[2].trim()), meta: meta || "" };
            }).filter(Boolean);
            patch({ items });
          }}
          placeholder={"Northwell AI Council update -> https://... | Feb 2026\nNew policy memo -> https://..."}
          style={{ minHeight: 120 }}
        />
        <span className="nf-hint">Format: <code>Label -&gt; URL | optional note</code></span>
      </Field>
    </>
  );
}

function GovernanceInspector({ d, patch }: { d: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const [md, setMd] = useState((d._md as string) ?? "");
  useEffect(() => { setMd((d._md as string) ?? ""); }, [d._md]);

  return (
    <>
      <Field label="Badge (optional)">
        <input value={(d.badge as string) ?? ""} onChange={(e) => patch({ badge: e.target.value })} placeholder="Governance / Legal" />
      </Field>
      <Field label="Title">
        <input value={(d.title as string) ?? ""} onChange={(e) => patch({ title: e.target.value })} placeholder="Regulatory update" />
      </Field>
      <Field label="Body (Markdown)">
        <textarea
          value={md}
          onChange={(e) => {
            setMd(e.target.value);
            patch({ _md: e.target.value, body: parseMarkdown(e.target.value) });
          }}
          placeholder="Short note with links and context."
        />
      </Field>
    </>
  );
}

function SbarpInspector({ d, patch }: { d: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  // NOTE: React hooks cannot be called conditionally; build sections explicitly below.
  const [situationMd, setSituationMd] = useState((d._situationMd as string) ?? "");
  const [backgroundMd, setBackgroundMd] = useState((d._backgroundMd as string) ?? "");
  const [assessmentMd, setAssessmentMd] = useState((d._assessmentMd as string) ?? "");
  const [recommendationMd, setRecommendationMd] = useState((d._recommendationMd as string) ?? "");
  const [promptMd, setPromptMd] = useState((d._promptMd as string) ?? "");
  useEffect(() => { setSituationMd((d._situationMd as string) ?? ""); }, [d._situationMd]);
  useEffect(() => { setBackgroundMd((d._backgroundMd as string) ?? ""); }, [d._backgroundMd]);
  useEffect(() => { setAssessmentMd((d._assessmentMd as string) ?? ""); }, [d._assessmentMd]);
  useEffect(() => { setRecommendationMd((d._recommendationMd as string) ?? ""); }, [d._recommendationMd]);
  useEffect(() => { setPromptMd((d._promptMd as string) ?? ""); }, [d._promptMd]);

  return (
    <>
      <Field label="Title">
        <input value={(d.title as string) ?? ""} onChange={(e) => patch({ title: e.target.value })} placeholder="SBAR-P" />
      </Field>

      <Field label="Situation (Markdown)">
        <textarea value={situationMd} onChange={(e) => { setSituationMd(e.target.value); patch({ _situationMd: e.target.value, situation: parseMarkdown(e.target.value) }); }} />
      </Field>
      <Field label="Background (Markdown)">
        <textarea value={backgroundMd} onChange={(e) => { setBackgroundMd(e.target.value); patch({ _backgroundMd: e.target.value, background: parseMarkdown(e.target.value) }); }} />
      </Field>
      <Field label="Assessment (Markdown)">
        <textarea value={assessmentMd} onChange={(e) => { setAssessmentMd(e.target.value); patch({ _assessmentMd: e.target.value, assessment: parseMarkdown(e.target.value) }); }} />
      </Field>
      <Field label="Recommendation (Markdown)">
        <textarea value={recommendationMd} onChange={(e) => { setRecommendationMd(e.target.value); patch({ _recommendationMd: e.target.value, recommendation: parseMarkdown(e.target.value) }); }} />
      </Field>
      <Field label="Prompt (Markdown)">
        <textarea value={promptMd} onChange={(e) => { setPromptMd(e.target.value); patch({ _promptMd: e.target.value, prompt: parseMarkdown(e.target.value) }); }} />
      </Field>
    </>
  );
}

function PromptInspector({ d, patch }: { d: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const mk = (key: string, mdKey: string) => {
    const [md, setMd] = useState((d as any)[mdKey] ?? "");
    useEffect(() => { setMd((d as any)[mdKey] ?? ""); }, [(d as any)[mdKey]]);
    return { md, setMd };
  };

  const t = mk("template","_templateMd");
  const g = mk("good","_goodMd");
  const b = mk("bad","_badMd");
  const tips = mk("tips","_tipsMd");

  return (
    <>
      <Field label="Title">
        <input value={(d.title as string) ?? ""} onChange={(e) => patch({ title: e.target.value })} placeholder="Prompt like a Rockstar" />
      </Field>

      <Field label="Template (Markdown)">
        <textarea value={t.md} onChange={(e) => { t.setMd(e.target.value); patch({ _templateMd: e.target.value, template: parseMarkdown(e.target.value) }); }} />
      </Field>

      <Field label="Good Prompt (Markdown)">
        <textarea value={g.md} onChange={(e) => { g.setMd(e.target.value); patch({ _goodMd: e.target.value, good: parseMarkdown(e.target.value) }); }} />
      </Field>

      <Field label="Bad Prompt (Markdown)">
        <textarea value={b.md} onChange={(e) => { b.setMd(e.target.value); patch({ _badMd: e.target.value, bad: parseMarkdown(e.target.value) }); }} />
      </Field>

      <Field label="Tips (Markdown)">
        <textarea value={tips.md} onChange={(e) => { tips.setMd(e.target.value); patch({ _tipsMd: e.target.value, tips: parseMarkdown(e.target.value) }); }} />
      </Field>
    </>
  );
}

function TermInspector({ d, patch }: { d: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const [defMd, setDefMd] = useState((d._definitionMd as string) ?? "");
  const [whyMd, setWhyMd] = useState((d._whyMd as string) ?? "");
  useEffect(() => { setDefMd((d._definitionMd as string) ?? ""); }, [d._definitionMd]);
  useEffect(() => { setWhyMd((d._whyMd as string) ?? ""); }, [d._whyMd]);

  return (
    <>
      <Field label="Term">
        <input value={(d.term as string) ?? ""} onChange={(e) => patch({ term: e.target.value })} placeholder="LLM, RAG, Agent..." />
      </Field>
      <Field label="Definition (Markdown)">
        <textarea value={defMd} onChange={(e) => { setDefMd(e.target.value); patch({ _definitionMd: e.target.value, definition: parseMarkdown(e.target.value) }); }} />
      </Field>
      <Field label="Why it matters (Markdown)">
        <textarea value={whyMd} onChange={(e) => { setWhyMd(e.target.value); patch({ _whyMd: e.target.value, why: parseMarkdown(e.target.value) }); }} />
      </Field>
    </>
  );
}

function HistoryInspector({ d, patch }: { d: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const [md, setMd] = useState((d._md as string) ?? "");
  useEffect(() => { setMd((d._md as string) ?? ""); }, [d._md]);
  return (
    <>
      <Field label="Title">
        <input value={(d.title as string) ?? ""} onChange={(e) => patch({ title: e.target.value })} placeholder="AI History" />
      </Field>
      <Field label="Body (Markdown)">
        <textarea value={md} onChange={(e) => { setMd(e.target.value); patch({ _md: e.target.value, body: parseMarkdown(e.target.value) }); }} />
      </Field>
    </>
  );
}

function HumorInspector({ d, patch }: { d: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const [md, setMd] = useState((d._md as string) ?? "");
  useEffect(() => { setMd((d._md as string) ?? ""); }, [d._md]);
  return (
    <>
      <Field label="Title">
        <input value={(d.title as string) ?? ""} onChange={(e) => patch({ title: e.target.value })} placeholder="AI Humor" />
      </Field>
      <Field label="Body (Markdown)">
        <textarea value={md} onChange={(e) => { setMd(e.target.value); patch({ _md: e.target.value, body: parseMarkdown(e.target.value) }); }} />
      </Field>
    </>
  );
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────

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
        onChange={(e) => { setHex(e.target.value); onChange(e.target.value); }}
        className="nf-color-picker"
      />
      <input
        value={hex}
        onChange={(e) => {
          setHex(e.target.value);
          if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value);
        }}
        placeholder="#4F7FFF"
        className="nf-color-hex"
      />
    </div>
  );
}

// ── BLOCK PICKER MODAL ────────────────────────────────────────────────────────

function BlockPickerModal({ sectionId, onAdd, onClose }: {
  sectionId: string;
  onAdd: (sectionId: string, type: Block["type"]) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="nf-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="nf-modal nf-block-picker-modal">
        <div className="nf-modal-header">
          <span className="nf-modal-title">Add a Block</span>
          <button className="nf-icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="nf-block-picker-grid">
          {(Object.entries(blockRegistry) as [Block["type"], typeof blockRegistry[Block["type"]]][]).map(
            ([type, def]) => (
              <button
                key={type}
                className="nf-block-picker-card"
                onClick={() => onAdd(sectionId, type)}
              >
                <div className="nf-block-picker-icon">{def.icon}</div>
                <div className="nf-block-picker-title">{def.title}</div>
                <div className="nf-block-picker-desc">{def.description}</div>
                <div className={`nf-block-picker-badge${def.emailSafe ? "" : " warn"}`}>
                  {def.emailSafe ? "✓ Email safe" : "⚠ Web only"}
                </div>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ── LIBRARY MODAL ─────────────────────────────────────────────────────────────

function LibraryModal({ onLoad, onClose, showToast }: {
  onLoad: (name: string) => void;
  onClose: () => void;
  showToast: (msg: string, type: "success"|"info"|"error") => void;
}) {
  const [lib, setLib] = useState(() => getLibrary());

  const handleDelete = (name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    deleteFromLibrary(name);
    setLib(getLibrary());
    showToast(`Deleted "${name}"`, "info");
  };

  const entries = Object.values(lib).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );

  return (
    <div
      className="nf-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="nf-modal">
        <div className="nf-modal-header">
          <span className="nf-modal-title">Newsletter Library</span>
          <button className="nf-icon-btn" onClick={onClose}>✕</button>
        </div>
        {entries.length === 0 ? (
          <div className="nf-empty-state" style={{ padding: 28, textAlign: "center" }}>
            No saved newsletters yet.
            <br />
            <small>Click <strong>Save</strong> in the toolbar to store your work.</small>
          </div>
        ) : (
          <div className="nf-library-grid">
            {entries.map((entry) => (
              <div key={entry.name} className="nf-library-card">
                <div className="nf-library-card-name">{entry.name}</div>
                <div className="nf-library-card-date">
                  {new Date(entry.savedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="nf-library-card-actions">
                  <button
                    className="nf-btn nf-btn-primary nf-btn-sm"
                    onClick={() => onLoad(entry.name)}
                  >
                    Load
                  </button>
                  <button
                    className="nf-btn nf-btn-danger nf-btn-sm"
                    onClick={() => handleDelete(entry.name)}
                  >
                    Delete
                  </button>
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

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Renderer } from "../../renderer/Renderer";
import { normalizeIssue } from "../../core/issue/normalize";
import { migrateIssue } from "../../core/issue/migrate";
import type { Issue } from "../../core/issue/schema";

export function Viewer() {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [err, setErr] = useState<string>("");

  const onFile = async (f: File | null) => {
    if (!f) return;
    try {
      const json = JSON.parse(await f.text());
      setIssue(migrateIssue(normalizeIssue(json)));
      setErr("");
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  };

  return (
    <div className="nf-viewer">
      <div className="nf-viewer-topbar">
        <div className="nf-brand" style={{ fontSize: 14 }}>NewsForge</div>
        <span style={{ color: "var(--muted)", fontSize: 12 }}>Viewer</span>
        <div className="nf-spacer" />
        <label className="nf-btn nf-btn-primary" style={{ cursor: "pointer" }}>
          Load Newsletter JSON
          <input type="file" accept=".json" style={{ display: "none" }} onChange={e => onFile(e.target.files?.[0] ?? null)} />
        </label>
        <Link className="nf-btn nf-btn-ghost" to="/builder">← Builder</Link>
        <Link className="nf-btn nf-btn-ghost" to="/">Home</Link>
      </div>

      {err ? <div style={{ padding: "12px 20px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", margin: 12, borderRadius: 8, color: "#F87171", fontSize: 12 }}>{err}</div> : null}

      {issue ? (
        <div className="nf-viewer-content" style={{ padding: "24px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 680 }}>
            <Renderer issue={issue} mode="view" />
          </div>
        </div>
      ) : (
        <div className="nf-viewer-empty">
          <div style={{ fontSize: 32, marginBottom: 12 }}>📨</div>
          <div>Load a <strong>newsletter.json</strong> file to preview it here.</div>
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted2)" }}>
            Export JSON from the Builder, then load it here to see the final render.
          </div>
        </div>
      )}
    </div>
  );
}

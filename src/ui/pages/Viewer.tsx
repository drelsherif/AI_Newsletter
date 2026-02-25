import React, { useEffect, useState } from "react";
import { Renderer } from "../../renderer/Renderer";
import { normalizeIssue } from "../../core/issue/normalize";
import { migrateIssue } from "../../core/issue/migrate";
import type { Issue } from "../../core/issue/schema";

async function fetchDefault(): Promise<Issue | null> {
  try {
    const res = await fetch("./newsletter.json", { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return migrateIssue(normalizeIssue(json));
  } catch {
    return null;
  }
}

export function Viewer() {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    fetchDefault().then(setIssue);
  }, []);

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
    <div className="viewer-shell">
      <div className="topbar">
        <div className="brand">Viewer</div>
        <label className="btn ghost">
          Load JSON
          <input type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </label>
        <a className="btn ghost" href="/" style={{ marginLeft: "auto" }}>Home</a>
      </div>

      {err ? <div className="err">{err}</div> : null}
      {issue ? <Renderer issue={issue} mode="view" /> : <div className="empty">No newsletter.json found. Load one.</div>}
    </div>
  );
}

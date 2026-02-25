const KEY = "nap_vnext_draft_v2";

export function saveDraft(json: unknown) {
  try { localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), json })); } catch {}
}
export function loadDraft(): { savedAt: number; json: unknown } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
export function clearDraft() {
  try { localStorage.removeItem(KEY); } catch {}
}

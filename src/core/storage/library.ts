/**
 * Multi-newsletter library stored in localStorage.
 * Each entry is keyed by user-chosen name.
 */

const LIB_KEY = "nf_library_v3";
const DRAFT_KEY = "nf_draft_v3";

export interface LibraryEntry {
  name: string;
  savedAt: string;
  data: unknown;
}

export function getLibrary(): Record<string, LibraryEntry> {
  try {
    return JSON.parse(localStorage.getItem(LIB_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveToLibrary(name: string, data: unknown): void {
  const lib = getLibrary();
  lib[name] = { name, savedAt: new Date().toISOString(), data };
  try {
    localStorage.setItem(LIB_KEY, JSON.stringify(lib));
  } catch {
    // Storage full — prune oldest
    const keys = Object.keys(lib).sort((a, b) =>
      new Date(lib[a].savedAt).getTime() - new Date(lib[b].savedAt).getTime()
    );
    if (keys.length > 1) {
      delete lib[keys[0]];
      lib[name] = { name, savedAt: new Date().toISOString(), data };
      localStorage.setItem(LIB_KEY, JSON.stringify(lib));
    }
  }
}

export function deleteFromLibrary(name: string): void {
  const lib = getLibrary();
  delete lib[name];
  localStorage.setItem(LIB_KEY, JSON.stringify(lib));
}

export function renameInLibrary(oldName: string, newName: string): void {
  const lib = getLibrary();
  if (!lib[oldName] || oldName === newName) return;
  lib[newName] = { ...lib[oldName], name: newName };
  delete lib[oldName];
  localStorage.setItem(LIB_KEY, JSON.stringify(lib));
}

// Autosave draft (most recent working state, separate from library)
export function saveDraft(name: string, data: unknown): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, data, savedAt: Date.now() }));
  } catch {}
}

export function loadDraft(): { name: string; data: unknown; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

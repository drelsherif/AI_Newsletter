export type UndoState<T> = { past: T[]; present: T; future: T[] };

export function initUndo<T>(initial: T): UndoState<T> {
  return { past: [], present: initial, future: [] };
}
export function pushUndo<T>(st: UndoState<T>, next: T): UndoState<T> {
  return { past: [...st.past, st.present], present: next, future: [] };
}
export function undo<T>(st: UndoState<T>): UndoState<T> {
  if (!st.past.length) return st;
  const prev = st.past[st.past.length - 1];
  return { past: st.past.slice(0, -1), present: prev, future: [st.present, ...st.future] };
}
export function redo<T>(st: UndoState<T>): UndoState<T> {
  if (!st.future.length) return st;
  const next = st.future[0];
  return { past: [...st.past, st.present], present: next, future: st.future.slice(1) };
}

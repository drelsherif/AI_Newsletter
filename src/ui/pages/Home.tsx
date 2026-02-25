import React from "react";
import { Link } from "react-router-dom";

export function Home() {
  return (
    <div className="shell">
      <div className="card">
        <div className="h1">Newsletter Builder vNext (Scaffold v0.2)</div>
        <p className="p">
          This scaffold makes fonts, portable rich text, and asset packaging first-class so Web/Email exports stay stable.
        </p>
        <div className="row">
          <Link className="btn" to="/builder">Open Builder</Link>
          <Link className="btn ghost" to="/viewer">Open Viewer</Link>
        </div>
        <div className="small muted">
          Tip: For GH Pages set <code>VITE_BASE</code> before build (see README).
        </div>
      </div>
    </div>
  );
}

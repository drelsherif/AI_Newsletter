import React from "react";
import { Link } from "react-router-dom";

export function Home() {
  return (
    <div className="nf-home">
      <div className="nf-home-bg" />
      <div className="nf-home-card">
        <div className="nf-home-logo">NewsForge</div>
        <h1 className="nf-home-title">Beautiful newsletters,<br />built for free.</h1>
        <p className="nf-home-sub">
          An open-source newsletter builder that runs entirely in your browser.
          No accounts, no subscriptions, no limits — just great design.
        </p>
        <div className="nf-home-actions">
          <Link className="nf-btn nf-btn-primary nf-btn-lg" to="/builder">Open Builder →</Link>
          <Link className="nf-btn nf-btn-ghost nf-btn-lg" to="/viewer">View Newsletter</Link>
        </div>
        <div className="nf-home-features">
          {[
            ["⚡", "8 block types", "Text, articles, tickers, HTML, buttons & more"],
            ["🎨", "Full design control", "Colors, fonts, layout — all customizable"],
            ["💾", "Local library", "Save & manage multiple newsletters"],
            ["📧", "Email export", "Clean HTML ready to paste into any ESP"],
            ["🔗", "URL links everywhere", "Markdown links in text and article blocks"],
            ["</> HTML blocks", "Custom code", "Write raw HTML with a friendly label"],
          ].map(([icon, title, desc]) => (
            <div key={String(title)} className="nf-feature">
              <div className="nf-feature-icon">{icon}</div>
              <div>
                <div className="nf-feature-title">{title}</div>
                <div className="nf-feature-desc">{desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="nf-home-footer">
          Open source • Runs in browser • No sign-up required
        </div>
      </div>
    </div>
  );
}

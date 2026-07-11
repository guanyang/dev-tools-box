import React from "react";
import { createRoot } from "react-dom/client";
import { toolboxHref, tools } from "../../app/tools";
import "./popup.css";

function Popup() {
  return (
    <main className="popup-shell">
      <header>
        <span className="popup-mark">DT</span>
        <div>
          <h1>开发者工具箱</h1>
          <p>选择工具，在离线标签页中打开。</p>
        </div>
      </header>
      <nav aria-label="工具快捷入口">
        {tools.map((tool) => (
          <a
            href={toolboxHref(tool.id)}
            key={tool.id}
            rel="noopener"
            target="_blank"
          >
            <strong>{tool.label}</strong>
            <span>{tool.description}</span>
          </a>
        ))}
      </nav>
      <a className="open-all" href={toolboxHref()} rel="noopener" target="_blank">
        打开完整工具箱
      </a>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);

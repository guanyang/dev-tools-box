"use client";

import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { Highlight, themes } from "prism-react-renderer";
import { useContext } from "react";
import { ThemeContext } from "../workbench-preferences";

const jsonEditorExtensions = [json()];

export function JsonHighlight({ code, compact = false }: { code: string; compact?: boolean }) {
  const theme = useContext(ThemeContext);
  return (
    <Highlight theme={theme === "dark" ? themes.vsDark : themes.github} code={code || " "} language="json">
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre className={`json-code-view ${compact ? "compact" : ""} ${className}`} style={{ ...style, background: "transparent" }}>
          <code>
            {tokens.map((line, lineIndex) => (
              <span {...getLineProps({ line })} key={lineIndex}>
                {line.map((token, tokenIndex) => <span {...getTokenProps({ token })} key={tokenIndex} />)}
                {lineIndex < tokens.length - 1 ? "\n" : null}
              </span>
            ))}
          </code>
        </pre>
      )}
    </Highlight>
  );
}

export function JsonEditor({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const theme = useContext(ThemeContext);
  return (
    <CodeMirror
      aria-label={label}
      basicSetup={{ bracketMatching: true, closeBrackets: true, foldGutter: true, highlightActiveLine: true, highlightActiveLineGutter: true, lineNumbers: true }}
      className="json-editor"
      extensions={jsonEditorExtensions}
      height="290px"
      onChange={onChange}
      theme={theme}
      value={value}
    />
  );
}

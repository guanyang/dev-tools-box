"use client";

import { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { Highlight, themes } from "prism-react-renderer";

const jsonEditorExtensions = [json()];

export function JsonHighlight({ code, compact = false }: { code: string; compact?: boolean }) {
  return (
    <Highlight theme={themes.github} code={code || " "} language="json">
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={`json-code-view ${compact ? "compact" : ""} ${className}`}
          style={{ ...style, background: "transparent" }}
        >
          <code>
            {tokens.map((line, lineIndex) => (
              <span {...getLineProps({ line })} key={lineIndex}>
                {line.map((token, tokenIndex) => (
                  <span {...getTokenProps({ token })} key={tokenIndex} />
                ))}
                {lineIndex < tokens.length - 1 ? "\n" : null}
              </span>
            ))}
          </code>
        </pre>
      )}
    </Highlight>
  );
}

export function JsonEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <CodeMirror
      aria-label={label}
      basicSetup={{
        bracketMatching: true,
        closeBrackets: true,
        foldGutter: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        lineNumbers: true,
      }}
      className="json-editor"
      extensions={jsonEditorExtensions}
      height="290px"
      onChange={onChange}
      theme="light"
      value={value}
    />
  );
}

export function useCopyText() {
  const [copyStatus, setCopyStatus] = useState("");
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
  }, []);

  async function copyText(text: string, status = "已复制") {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopyStatus(status);
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => {
      setCopyStatus("");
      copyTimerRef.current = null;
    }, 1400);
  }

  return { copyStatus, copyText };
}

export function CopyToast({ status }: { status: string }) {
  return (
    <div
      className={status ? "copy-toast visible" : "copy-toast"}
      role="status"
      aria-atomic="true"
      aria-live="polite"
    >
      {status}
    </div>
  );
}

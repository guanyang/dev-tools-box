"use client";

import { useMemo, useState } from "react";
import { makeTextDiff, mergeTextLine } from "../tool-logic/doc-diff";

const sampleTextLeft = `Release Notes
Version: 1.8.0

- Added export for CSV reports
- Improved JSON parser errors
- Deprecated legacy token endpoint`;

const sampleTextRight = `Release Notes
Version: 1.9.0

- Added export for CSV and XLSX reports
- Improved JSON parser errors
- Added audit log preview`;

export default function DocDiffTool() {
  const [docLeft, setDocLeft] = useState(sampleTextLeft);
  const [docRight, setDocRight] = useState(sampleTextRight);
  const docDiff = useMemo(() => makeTextDiff(docLeft, docRight), [docLeft, docRight]);
  const diffCounts = useMemo(
    () => ({
      changed: docDiff.filter((line) => line.status === "changed").length,
      added: docDiff.filter((line) => line.status === "added").length,
      removed: docDiff.filter((line) => line.status === "removed").length,
    }),
    [docDiff],
  );

  function mergeDocLine(index: number, direction: "left-to-right" | "right-to-left") {
    const next = mergeTextLine(docLeft, docRight, index, direction);
    setDocLeft(next.left);
    setDocRight(next.right);
  }

  return (
    <section className="tool-panel">
      <div className="editor-grid">
        <label className="editor-block">
          <span>原始文档</span>
          <textarea value={docLeft} onChange={(event) => setDocLeft(event.target.value)} />
        </label>
        <label className="editor-block">
          <span>新文档</span>
          <textarea value={docRight} onChange={(event) => setDocRight(event.target.value)} />
        </label>
      </div>
      <div className="metric-row">
        <span>{diffCounts.changed} 修改</span>
        <span>{diffCounts.added} 新增</span>
        <span>{diffCounts.removed} 删除</span>
        <button type="button" onClick={() => setDocRight(docLeft)}>全部用左侧</button>
        <button type="button" onClick={() => setDocLeft(docRight)}>全部用右侧</button>
      </div>
      <div className="diff-table" role="table" aria-label="文档差异结果">
        {docDiff.map((line, index) => (
          <div className={`diff-row ${line.status}`} key={`${line.status}-${index}`}>
            <div className="line-number">{index + 1}</div>
            <pre>{line.left || " "}</pre>
            <pre>{line.right || " "}</pre>
            <div className="merge-actions">
              {line.status !== "same" && (
                <>
                  <button type="button" aria-label={`第 ${index + 1} 行使用左侧内容`} onClick={() => mergeDocLine(index, "left-to-right")}>左合右</button>
                  <button type="button" aria-label={`第 ${index + 1} 行使用右侧内容`} onClick={() => mergeDocLine(index, "right-to-left")}>右合左</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { makeTextDiff, mergeTextLine } from "../tool-logic/doc-diff";
import { ResizableSplit, SplitViewControls, type SplitViewMode, useSynchronizedScroll } from "./immersive-workspace";

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
  const [columnSplit, setColumnSplit] = useState(50);
  const [rowSplit, setRowSplit] = useState(46);
  const [viewMode, setViewMode] = useState<SplitViewMode>("split");
  const [lineWrapping, setLineWrapping] = useState(true);
  const [syncScrolling, setSyncScrolling] = useState(true);
  const panelRef = useRef<HTMLElement>(null);
  useSynchronizedScroll(panelRef, "textarea", syncScrolling);
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
    <section className="tool-panel immersive-tool" ref={panelRef}>
      <div className="immersive-toolbar">
        <div className="workspace-controls" aria-label="编辑器选项">
          <button aria-pressed={lineWrapping} className="workspace-control" onClick={() => setLineWrapping((current) => !current)} type="button">自动换行</button>
          <button aria-pressed={syncScrolling} className="workspace-control" onClick={() => setSyncScrolling((current) => !current)} type="button">同步滚动</button>
        </div>
        <SplitViewControls mode={viewMode} setMode={setViewMode} startLabel="输入" endLabel="差异" onReset={() => {
          setColumnSplit(50);
          setRowSplit(46);
          setViewMode("split");
        }} />
      </div>
      <ResizableSplit
        axis="rows"
        position={rowSplit}
        setPosition={setRowSplit}
        startLabel="输入区"
        endLabel="差异区"
        mode={viewMode}
        start={(
          <ResizableSplit
            axis="columns"
            position={columnSplit}
            setPosition={setColumnSplit}
            startLabel="原始文档"
            endLabel="新文档"
            start={<label className="editor-block immersive-editor"><span>原始文档</span><textarea wrap={lineWrapping ? "soft" : "off"} value={docLeft} onChange={(event) => setDocLeft(event.target.value)} /></label>}
            end={<label className="editor-block immersive-editor"><span>新文档</span><textarea wrap={lineWrapping ? "soft" : "off"} value={docRight} onChange={(event) => setDocRight(event.target.value)} /></label>}
          />
        )}
        end={(
          <div className="immersive-result-pane">
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
                        <button type="button" aria-label={`第 ${index + 1} 行使用左侧内容`} onClick={() => mergeDocLine(index, "left-to-right")}>用左侧覆盖右侧</button>
                        <button type="button" aria-label={`第 ${index + 1} 行使用右侧内容`} onClick={() => mergeDocLine(index, "right-to-left")}>用右侧覆盖左侧</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      />
    </section>
  );
}

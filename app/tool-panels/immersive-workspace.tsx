"use client";

import { RotateCcw } from "lucide-react";
import { type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject, useEffect, useRef } from "react";

export type SplitViewMode = "split" | "start" | "end";

type ResizableSplitProps = {
  axis: "columns" | "rows";
  position: number;
  setPosition: (position: number) => void;
  start: ReactNode;
  end: ReactNode;
  startLabel: string;
  endLabel: string;
  mode?: SplitViewMode;
};

const MIN_SPLIT = 25;
const MAX_SPLIT = 75;

function clampSplit(value: number) {
  return Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, value));
}

export function ResizableSplit({
  axis,
  position,
  setPosition,
  start,
  end,
  startLabel,
  endLabel,
  mode = "split",
}: ResizableSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  function updateFromPointer(event: PointerEvent<HTMLDivElement>) {
    const container = containerRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    const value = axis === "columns"
      ? ((event.clientX - bounds.left) / bounds.width) * 100
      : ((event.clientY - bounds.top) / bounds.height) * 100;
    setPosition(clampSplit(value));
  }

  function resizeWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    const decrementKey = axis === "columns" ? "ArrowLeft" : "ArrowUp";
    const incrementKey = axis === "columns" ? "ArrowRight" : "ArrowDown";
    if (event.key === decrementKey) {
      event.preventDefault();
      setPosition(clampSplit(position - 5));
    } else if (event.key === incrementKey) {
      event.preventDefault();
      setPosition(clampSplit(position + 5));
    } else if (event.key === "Home") {
      event.preventDefault();
      setPosition(MIN_SPLIT);
    } else if (event.key === "End") {
      event.preventDefault();
      setPosition(MAX_SPLIT);
    }
  }

  const style = { "--split-position": `${position}%` } as CSSProperties;
  return (
    <div className={`resizable-split ${axis} view-${mode}`} ref={containerRef} style={style}>
      {mode !== "end" && <div className="split-pane split-start">{start}</div>}
      {mode === "split" && (
        <div
          aria-label={`调整${startLabel}和${endLabel}大小`}
          aria-orientation={axis === "columns" ? "vertical" : "horizontal"}
          aria-valuemax={MAX_SPLIT}
          aria-valuemin={MIN_SPLIT}
          aria-valuenow={Math.round(position)}
          className="split-handle"
          onDoubleClick={() => setPosition(50)}
          onKeyDown={resizeWithKeyboard}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            updateFromPointer(event);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromPointer(event);
          }}
          onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
          role="separator"
          tabIndex={0}
        />
      )}
      {mode !== "start" && <div className="split-pane split-end">{end}</div>}
    </div>
  );
}

export function SplitViewControls({
  mode,
  setMode,
  startLabel,
  endLabel,
  onReset,
}: {
  mode: SplitViewMode;
  setMode: (mode: SplitViewMode) => void;
  startLabel: string;
  endLabel: string;
  onReset: () => void;
}) {
  return (
    <div className="workspace-controls" aria-label="工作区布局">
      <button aria-pressed={mode === "start"} className="workspace-control" onClick={() => setMode(mode === "start" ? "split" : "start")} type="button">
        {mode === "start" ? "恢复分栏" : `只看${startLabel}`}
      </button>
      <button aria-pressed={mode === "end"} className="workspace-control" onClick={() => setMode(mode === "end" ? "split" : "end")} type="button">
        {mode === "end" ? "恢复分栏" : `只看${endLabel}`}
      </button>
      <button className="workspace-control icon-control" onClick={onReset} title="恢复默认布局" type="button">
        <RotateCcw aria-hidden="true" size={14} />
        <span>重置布局</span>
      </button>
    </div>
  );
}

export function useSynchronizedScroll(containerRef: RefObject<HTMLElement | null>, selector: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const elements = Array.from(containerRef.current?.querySelectorAll<HTMLElement>(selector) ?? []);
    if (elements.length < 2) return;
    let syncing = false;

    const cleanups = elements.map((source) => {
      const sync = () => {
        if (syncing) return;
        syncing = true;
        const verticalRange = source.scrollHeight - source.clientHeight;
        const horizontalRange = source.scrollWidth - source.clientWidth;
        const verticalRatio = verticalRange > 0 ? source.scrollTop / verticalRange : 0;
        const horizontalRatio = horizontalRange > 0 ? source.scrollLeft / horizontalRange : 0;
        for (const target of elements) {
          if (target === source) continue;
          target.scrollTop = verticalRatio * Math.max(0, target.scrollHeight - target.clientHeight);
          target.scrollLeft = horizontalRatio * Math.max(0, target.scrollWidth - target.clientWidth);
        }
        requestAnimationFrame(() => { syncing = false; });
      };
      source.addEventListener("scroll", sync, { passive: true });
      return () => source.removeEventListener("scroll", sync);
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [containerRef, enabled, selector]);
}

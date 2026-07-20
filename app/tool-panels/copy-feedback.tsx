"use client";

import { useEffect, useRef, useState } from "react";

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

"use client";

import { useEffect, useState } from "react";
import { preloadToolModules } from "./tool-loaders";

export function PwaClient() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !location.protocol.startsWith("http")) return;

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker.register("/sw.js").then(async (registration) => {
      if (registration.waiting) setWaitingWorker(registration.waiting);
      registration.addEventListener("updatefound", () => {
        registration.installing?.addEventListener("statechange", () => {
          if (registration.waiting && navigator.serviceWorker.controller) setWaitingWorker(registration.waiting);
        });
      });

      await navigator.serviceWorker.ready;
      const schedule = window.requestIdleCallback ?? ((callback: IdleRequestCallback) => window.setTimeout(callback, 1));
      schedule(async () => {
        await preloadToolModules();
        const urls = [location.href, ...performance.getEntriesByType("resource").map((entry) => entry.name)]
          .filter((url) => new URL(url, location.href).origin === location.origin);
        (navigator.serviceWorker.controller ?? registration.active)?.postMessage({ type: "CACHE_URLS", urls: [...new Set(urls)] });
      });
    }).catch(() => {
      // PWA support is progressive; the toolbox remains usable when registration fails.
    });

    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  if (!waitingWorker) return null;
  return (
    <button className="update-toast" type="button" onClick={() => waitingWorker.postMessage({ type: "SKIP_WAITING" })}>
      新版本已就绪，点击更新
    </button>
  );
}

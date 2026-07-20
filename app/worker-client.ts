import type { HeavyTask } from "./tool-logic/worker-tasks.ts";
import type { WorkerResponse } from "./tool-logic/worker-protocol";

export const WORKER_THRESHOLD_BYTES = 100_000;

export function shouldUseWorker(input: string) {
  return new TextEncoder().encode(input).byteLength >= WORKER_THRESHOLD_BYTES;
}

export async function runWorkerTask(task: HeavyTask, options: { signal?: AbortSignal; onProgress?: (progress: number) => void } = {}): Promise<string> {
  if (options.signal?.aborted) throw new DOMException("任务已取消", "AbortError");
  if (typeof Worker === "undefined") throw new Error("当前浏览器不支持 Web Worker");

  return new Promise((resolve, reject) => {
    const taskId = crypto.randomUUID();
    const worker = new Worker(new URL("./workers/heavy-worker.ts", import.meta.url), { type: "module" });
    const cleanup = () => {
      options.signal?.removeEventListener("abort", abort);
      worker.terminate();
    };
    const abort = () => {
      worker.postMessage({ type: "cancel", taskId });
      cleanup();
      reject(new DOMException("任务已取消", "AbortError"));
    };
    options.signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.taskId !== taskId) return;
      if (event.data.type === "progress") options.onProgress?.(event.data.progress);
      if (event.data.type === "result") { cleanup(); resolve(event.data.value); }
      if (event.data.type === "error") { cleanup(); reject(new Error(event.data.message)); }
    };
    worker.onerror = () => { cleanup(); reject(new Error("Worker 执行失败")); };
    worker.postMessage({ type: "run", taskId, task });
  });
}

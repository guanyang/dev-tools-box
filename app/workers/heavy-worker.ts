/// <reference lib="webworker" />

import { executeHeavyTask } from "../tool-logic/worker-tasks";
import type { WorkerRequest } from "../tool-logic/worker-protocol";

const cancelledTasks = new Set<string>();

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { taskId } = event.data;
  if (event.data.type === "cancel") {
    cancelledTasks.add(taskId);
    return;
  }
  const { task } = event.data;
  try {
    const value = await executeHeavyTask(task, (progress) => {
      if (cancelledTasks.has(taskId)) throw new DOMException("任务已取消", "AbortError");
      self.postMessage({ type: "progress", taskId, progress });
    });
    self.postMessage({ type: "result", taskId, value });
  } catch (error) {
    const cancelled = error instanceof DOMException && error.name === "AbortError";
    self.postMessage({ type: "error", taskId, message: cancelled ? "任务已取消" : error instanceof Error ? error.message : "Worker 执行失败", code: cancelled ? "TASK_CANCELLED" : "TASK_FAILED" });
  } finally {
    cancelledTasks.delete(taskId);
  }
};

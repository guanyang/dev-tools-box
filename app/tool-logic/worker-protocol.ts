import type { HeavyTask } from "./worker-tasks.ts";

export type WorkerRequest =
  | { type: "run"; taskId: string; task: HeavyTask }
  | { type: "cancel"; taskId: string };

export type WorkerResponse =
  | { type: "progress"; taskId: string; progress: number }
  | { type: "result"; taskId: string; value: string }
  | { type: "error"; taskId: string; message: string; code: "TASK_FAILED" | "TASK_CANCELLED" };

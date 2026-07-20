import { convertData, type DataFormat } from "./data-format.ts";
import { transformJson } from "./json.ts";

export type HeavyTask =
  | { type: "json-transform"; input: string; space?: number }
  | { type: "data-convert"; input: string; from: DataFormat; to: DataFormat };

export async function executeHeavyTask(task: HeavyTask, onProgress: (progress: number) => void = () => {}): Promise<string> {
  onProgress(0);
  let result: string;
  if (task.type === "json-transform") {
    const transformed = transformJson(task.input, task.space);
    if (transformed.error) throw new Error(transformed.error);
    result = transformed.value as string;
  } else {
    result = convertData(task.input, task.from, task.to);
  }
  onProgress(100);
  return result;
}

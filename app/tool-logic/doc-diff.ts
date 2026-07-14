export type DiffStatus = "same" | "changed" | "added" | "removed";
export type DiffLine = { left: string; right: string; status: DiffStatus };

export function makeTextDiff(left: string, right: string): DiffLine[] {
  const leftLines = left.split(/\r?\n/);
  const rightLines = right.split(/\r?\n/);
  const max = Math.max(leftLines.length, rightLines.length);
  return Array.from({ length: max }, (_, index) => {
    const leftLine = leftLines[index] ?? "";
    const rightLine = rightLines[index] ?? "";
    if (leftLine === rightLine) return { left: leftLine, right: rightLine, status: "same" };
    if (index >= leftLines.length) return { left: "", right: rightLine, status: "added" };
    if (index >= rightLines.length) return { left: leftLine, right: "", status: "removed" };
    return { left: leftLine, right: rightLine, status: "changed" };
  });
}

export function mergeTextLine(
  left: string,
  right: string,
  index: number,
  direction: "left-to-right" | "right-to-left",
): { left: string; right: string } {
  const leftLines = left.split(/\r?\n/);
  const rightLines = right.split(/\r?\n/);
  const sourceLines = direction === "left-to-right" ? leftLines : rightLines;
  const targetLines = direction === "left-to-right" ? rightLines : leftLines;
  if (index >= sourceLines.length) targetLines.splice(index, 1);
  else targetLines[index] = sourceLines[index];
  return direction === "left-to-right"
    ? { left, right: targetLines.join("\n") }
    : { left: targetLines.join("\n"), right };
}

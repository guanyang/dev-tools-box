export type RegexMatch = {
  value: string;
  index: number;
  captures: Array<string | undefined>;
  groups: Record<string, string>;
};

function advanceAfterEmptyMatch(input: string, index: number, unicode: boolean): number {
  if (!unicode || index >= input.length) return index + 1;
  const first = input.charCodeAt(index);
  if (first < 0xd800 || first > 0xdbff || index + 1 >= input.length) return index + 1;
  const second = input.charCodeAt(index + 1);
  return second >= 0xdc00 && second <= 0xdfff ? index + 2 : index + 1;
}

export function runRegex(
  pattern: string,
  flags: string,
  input: string,
  replacement = "",
): { matches: RegexMatch[]; replaced: string } {
  const matcher = new RegExp(pattern, flags);
  const matches: RegexMatch[] = [];
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(input)) !== null) {
    matches.push({
      value: match[0],
      index: match.index,
      captures: match.slice(1),
      groups: { ...(match.groups ?? {}) },
    });
    if (!flags.includes("g")) break;
    if (match[0] === "") {
      matcher.lastIndex = advanceAfterEmptyMatch(input, matcher.lastIndex, flags.includes("u"));
    }
  }
  return {
    matches,
    replaced: input.replace(new RegExp(pattern, flags), replacement),
  };
}

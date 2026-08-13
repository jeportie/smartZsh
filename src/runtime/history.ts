const joinContinuations = (raw: string): string[] => {
  const logical: string[] = [];
  let buffer: string | undefined;
  for (const line of raw.split("\n")) {
    const current = buffer === undefined ? line : `${buffer}\n${line}`;
    if (current.endsWith("\\")) {
      buffer = current.slice(0, -1);
    } else {
      logical.push(current);
      buffer = undefined;
    }
  }
  if (buffer !== undefined) logical.push(buffer);
  return logical;
};

export const parseHistory = (raw: string): string[] => {
  const lines = joinContinuations(raw)
    .map((line) => line.replace(/^: \d+:\d+;/, ""))
    .filter((line) => line.length > 0)
    .reverse();
  const seen = new Set<string>();
  return lines.filter((line) => {
    if (seen.has(line)) return false;
    seen.add(line);
    return true;
  });
};

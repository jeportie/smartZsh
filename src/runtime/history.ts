export const parseHistory = (raw: string): string[] => {
  const lines = raw
    .split("\n")
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

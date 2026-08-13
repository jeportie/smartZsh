export const parseHistory = (raw: string): string[] => {
  return raw
    .split("\n")
    .map((line) => line.replace(/^: \d+:\d+;/, ""))
    .filter((line) => line.length > 0)
    .reverse();
};

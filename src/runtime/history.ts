export const parseHistory = (raw: string): string[] => {
  return raw
    .split("\n")
    .filter((line) => line.length > 0)
    .reverse();
};

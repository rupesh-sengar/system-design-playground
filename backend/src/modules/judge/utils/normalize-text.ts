export const normalizeText = (text: string): string =>
  text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9.%/\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

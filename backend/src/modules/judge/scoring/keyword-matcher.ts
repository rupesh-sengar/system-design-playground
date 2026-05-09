import type { RequirementCheck } from "../types.js";
import { normalizeText } from "../utils/normalize-text.js";

export const getMatchedKeywords = (
  submission: string,
  check: RequirementCheck,
): string[] => {
  const text = normalizeText(submission);
  const terms = [...check.keywords, ...(check.synonyms ?? [])];

  return terms.filter((term) => {
    const normalizedTerm = normalizeText(term);
    return normalizedTerm.length > 0 && text.includes(normalizedTerm);
  });
};

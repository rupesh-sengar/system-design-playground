import type { RequirementCheck } from "../types.js";
import { normalizeText } from "../utils/normalize-text.js";

const PARTIAL_SIMILARITY_THRESHOLD = 0.08;
const STRONG_SIMILARITY_THRESHOLD = 0.18;

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "for",
  "from",
  "how",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "should",
  "support",
  "system",
  "that",
  "the",
  "this",
  "to",
  "what",
  "when",
  "where",
  "which",
  "will",
  "with",
]);

const semanticAliases: Record<string, string[]> = {
  appoint: ["event", "meeting"],
  available: ["availability", "free"],
  book: ["create", "schedule", "reserve"],
  callback: ["webhook", "event"],
  change: ["update", "modify"],
  client: ["user", "consumer"],
  guest: ["attendee", "participant"],
  meet: ["event", "appointment"],
  meeting: ["event", "appointment"],
  permission: ["authorization", "access"],
  private: ["privacy", "security"],
  reserv: ["reserve", "schedule", "create", "availability"],
  reserve: ["create", "schedule", "book"],
  retryable: ["retry"],
  slot: ["availability", "schedule"],
};

type Vector = Map<string, number>;

export type VectorCoverageMatch = {
  matchedText: string | null;
  referenceText: string;
  score: number;
  status: "missing" | "partial" | "strong";
};

const stemToken = (token: string): string => {
  if (token.length <= 3) {
    return token;
  }

  if (token.endsWith("ies") && token.length > 5) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.endsWith("ing") && token.length > 6) {
    const base = token.slice(0, -3);
    return base.endsWith("ul") ? `${base}e` : base;
  }

  if (token.endsWith("ed") && token.length > 5) {
    return token.slice(0, -2);
  }

  if (token.endsWith("es") && token.length > 5) {
    return token.slice(0, -2);
  }

  if (token.endsWith("s") && token.length > 4) {
    return token.slice(0, -1);
  }

  return token;
};

const tokenize = (text: string): string[] =>
  normalizeText(text)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !stopWords.has(token))
    .map(stemToken);

const addFeature = (vector: Vector, feature: string, weight: number): void => {
  vector.set(feature, Math.max(vector.get(feature) ?? 0, weight));
};

const buildVector = (text: string): Vector => {
  const tokens = tokenize(text);
  const vector: Vector = new Map();

  tokens.forEach((token) => {
    addFeature(vector, token, 1);

    semanticAliases[token]?.forEach((alias) => {
      addFeature(vector, stemToken(alias), 0.85);
    });
  });

  for (let index = 0; index < tokens.length - 1; index += 1) {
    addFeature(vector, `${tokens[index]}_${tokens[index + 1]}`, 1.4);
  }

  for (let index = 0; index < tokens.length - 2; index += 1) {
    addFeature(
      vector,
      `${tokens[index]}_${tokens[index + 1]}_${tokens[index + 2]}`,
      1.8,
    );
  }

  return vector;
};

const vectorSimilarity = (left: Vector, right: Vector): number => {
  let dotProduct = 0;
  let leftMagnitudeSquared = 0;
  let rightMagnitudeSquared = 0;

  left.forEach((value, key) => {
    dotProduct += value * (right.get(key) ?? 0);
    leftMagnitudeSquared += value * value;
  });

  right.forEach((value) => {
    rightMagnitudeSquared += value * value;
  });

  if (leftMagnitudeSquared === 0 || rightMagnitudeSquared === 0) {
    return 0;
  }

  const cosine = dotProduct / Math.sqrt(leftMagnitudeSquared * rightMagnitudeSquared);
  const referenceCoverage = dotProduct / leftMagnitudeSquared;

  return Math.max(cosine, referenceCoverage);
};

const getReferenceText = (check: RequirementCheck): string =>
  [
    check.label,
    check.description,
    ...check.keywords,
    ...(check.synonyms ?? []),
    ...(check.vectorPhrases ?? []),
    ...(check.quantificationHints ?? []),
  ]
    .filter(Boolean)
    .join(" ");

const chunkSubmission = (submission: string): string[] => {
  const segments = submission
    .replace(/<[^>]+>/g, " ")
    .split(/(?:[\n\r]+|[.!?;:,]+)\s*/)
    .map((segment) => normalizeText(segment))
    .filter((segment) => segment.length >= 12);

  const chunks = new Set<string>();

  segments.forEach((segment, index) => {
    chunks.add(segment);

    const nextSegment = segments[index + 1];
    if (nextSegment) {
      chunks.add(`${segment} ${nextSegment}`);
    }
  });

  const normalizedSubmission = normalizeText(submission);
  if (normalizedSubmission.length >= 12) {
    chunks.add(normalizedSubmission);
  }

  return Array.from(chunks).slice(0, 80);
};

export const getVectorCoverageMatch = (
  submission: string,
  check: RequirementCheck,
): VectorCoverageMatch => {
  const referenceText = getReferenceText(check);
  const referenceVector = buildVector(referenceText);
  const chunks = chunkSubmission(submission);

  let bestScore = 0;
  let bestText: string | null = null;

  chunks.forEach((chunk) => {
    const score = vectorSimilarity(referenceVector, buildVector(chunk));

    if (score > bestScore) {
      bestScore = score;
      bestText = chunk;
    }
  });

  const roundedScore = Number(bestScore.toFixed(3));

  if (bestScore >= STRONG_SIMILARITY_THRESHOLD) {
    return {
      matchedText: bestText,
      referenceText,
      score: roundedScore,
      status: "strong",
    };
  }

  if (bestScore >= PARTIAL_SIMILARITY_THRESHOLD) {
    return {
      matchedText: bestText,
      referenceText,
      score: roundedScore,
      status: "partial",
    };
  }

  return {
    matchedText: bestText,
    referenceText,
    score: roundedScore,
    status: "missing",
  };
};

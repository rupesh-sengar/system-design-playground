import type { ZodTypeAny, output } from "zod";

const stripCodeFence = (value: string): string => {
  const fencedMatch = value.trim().match(/^```(?:json)?\s*([\s\S]*?)```$/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  return value.trim();
};

const extractJsonObject = (value: string): string => {
  const normalized = stripCodeFence(value);
  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return normalized.slice(firstBrace, lastBrace + 1);
  }

  return normalized;
};

export const parseStructuredOutput = <Schema extends ZodTypeAny>(
  schema: Schema,
  rawValue: string,
): output<Schema> => {
  const candidate = extractJsonObject(rawValue);
  const parsedJson = JSON.parse(candidate) as unknown;
  return schema.parse(parsedJson);
};

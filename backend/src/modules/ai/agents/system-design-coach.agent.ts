import { LlmAgent } from "@google/adk";
import {
  feedbackValidationInstruction,
  hintGenerationInstruction,
} from "../prompts.js";

export const createFeedbackValidationAgent = (
  model: string,
): LlmAgent =>
  new LlmAgent({
    name: "feedbackValidationAgent",
    model,
    description:
      "Evaluates system design submissions and returns structured validation feedback.",
    instruction: feedbackValidationInstruction,
  });

export const createHintGenerationAgent = (model: string): LlmAgent =>
  new LlmAgent({
    name: "hintGenerationAgent",
    model,
    description:
      "Provides stage-specific coaching hints for a system design draft.",
    instruction: hintGenerationInstruction,
  });

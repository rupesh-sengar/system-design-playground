import type { AppConfig } from "../../config/env.js";
import { GeminiAdkProvider } from "../gemini/gemini-adk.provider.js";
import type { LlmProvider } from "./llm-provider.js";

export const createLlmProvider = (config: AppConfig): LlmProvider =>
  new GeminiAdkProvider({
    appName: config.APP_NAME,
    configured: config.hasGeminiCredentials,
    model: config.GEMINI_MODEL,
  });

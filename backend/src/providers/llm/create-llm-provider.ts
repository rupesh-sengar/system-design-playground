import type { AppConfig } from "../../config/env.js";
import { DeepSeekProvider } from "../deepseek/deepseek.provider.js";
import type { LlmProvider } from "./llm-provider.js";

export const createLlmProvider = (config: AppConfig): LlmProvider =>
  new DeepSeekProvider({
    apiKey: config.deepseek.apiKey,
    baseUrl: config.deepseek.baseUrl,
    configured: config.hasDeepSeekCredentials,
    model: config.deepseek.model,
    requestTimeoutMs: config.deepseek.requestTimeoutMs,
  });

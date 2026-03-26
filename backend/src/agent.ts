import "dotenv/config";
import { getEnv } from "./config/env.js";
import { createFeedbackValidationAgent } from "./modules/ai/agents/system-design-coach.agent.js";

const env = getEnv();

export const rootAgent = createFeedbackValidationAgent(env.GEMINI_MODEL);

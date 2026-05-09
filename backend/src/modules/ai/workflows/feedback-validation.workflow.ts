import type {
  ValidateDesignRequest,
} from "../contracts.js";
import { judgeSubmission } from "../../judge/judge.service.js";
import type { JudgeResponseEnvelope } from "../../judge/types.js";

export class FeedbackValidationWorkflow {
  run(input: ValidateDesignRequest): Promise<JudgeResponseEnvelope> {
    return judgeSubmission(input);
  }
}

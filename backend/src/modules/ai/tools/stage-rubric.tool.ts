import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { stageIdSchema, type StageId } from "../contracts.js";

type StageRubric = {
  criteria: string[];
  redFlags: string[];
  deliverable: string;
};

const stageRubrics: Record<StageId, StageRubric> = {
  requirements: {
    deliverable: "A clearly scoped problem definition with functional and non-functional requirements.",
    criteria: [
      "Identifies the primary user flow and the most important action.",
      "Separates in-scope and out-of-scope functionality early.",
      "Calls out latency, durability, consistency, and scale expectations.",
    ],
    redFlags: [
      "Jumping to components before clarifying scope.",
      "Missing success metrics or SLOs.",
      "Ignoring edge cases such as abuse, failure, or compliance needs.",
    ],
  },
  "core-entities": {
    deliverable: "A clean domain model with key entities, ownership, and high-value relationships.",
    criteria: [
      "Defines core entities and their identifiers.",
      "Explains cardinality and ownership boundaries.",
      "Highlights heavy-write or heavy-read entities.",
    ],
    redFlags: [
      "Modeling too much implementation detail too early.",
      "Missing the hottest entities or relationships.",
      "No discussion of sharding or partition keys where needed.",
    ],
  },
  "api-interface": {
    deliverable: "A coherent API contract with the right writes, reads, and async boundaries.",
    criteria: [
      "Defines the main APIs or events that power the user flows.",
      "Calls out idempotency, pagination, and validation where necessary.",
      "Explains synchronous versus asynchronous operations.",
    ],
    redFlags: [
      "Overloaded endpoints with unclear responsibility.",
      "No strategy for retries or duplicate requests.",
      "Ignoring auth, quota, or tenant boundaries.",
    ],
  },
  "data-flow": {
    deliverable: "A traceable read/write path that shows how requests move through the system.",
    criteria: [
      "Explains the hot write path end-to-end.",
      "Explains the hot read path end-to-end.",
      "Calls out queues, caches, storage layers, and failure paths.",
    ],
    redFlags: [
      "Hand-waving around consistency and ordering.",
      "No handling of retries, duplicates, or backpressure.",
      "No explanation of cache invalidation or propagation.",
    ],
  },
  "high-level-design": {
    deliverable: "A scalable architecture with justified component choices and tradeoffs.",
    criteria: [
      "Names the critical services and storage systems.",
      "Connects design choices to scale and SLO requirements.",
      "Explains major tradeoffs such as consistency, fan-out, or partitioning.",
    ],
    redFlags: [
      "Component soup without a dominant architecture.",
      "No rationale for key storage or messaging choices.",
      "Treating every subsystem as mandatory on day one.",
    ],
  },
  "deep-dives": {
    deliverable: "Focused discussion of failure modes, tradeoffs, and hard scaling edges.",
    criteria: [
      "Identifies the most likely bottlenecks or hot keys.",
      "Explains one or two deep technical tradeoffs clearly.",
      "Shows mitigation strategies for reliability and observability risks.",
    ],
    redFlags: [
      "Surface-level observations without mitigation plans.",
      "No mention of operations, monitoring, or recovery.",
      "Over-optimizing unproven bottlenecks.",
    ],
  },
};

export const createStageRubricTool = (): FunctionTool =>
  new FunctionTool({
    name: "get_stage_rubric",
    description:
      "Returns the review rubric, expected deliverable, and common red flags for a system design interview stage.",
    parameters: z.object({
      stageId: stageIdSchema.describe(
        "The system design interview stage to evaluate.",
      ),
    }),
    execute: async ({ stageId }: { stageId: StageId }) => ({
      stageId,
      ...stageRubrics[stageId],
    }),
  });

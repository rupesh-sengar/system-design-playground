import type { PracticeStageDefinition } from "./types";

export const practiceStages: PracticeStageDefinition[] = [
  {
    id: "requirements",
    step: 1,
    title: "Requirements",
    objective: "Clarify the product scope before you draw architecture.",
    deliverable: "A crisp list of functional and non-functional requirements.",
    prompts: [
      "What does the system have to do for the user on day one?",
      "What scale, latency, availability, or consistency constraints matter most?",
      "What is explicitly out of scope for this interview round?",
    ],
    reviewChecks: [
      "Functional requirements are concrete and testable",
      "Non-functional targets are quantified where possible",
      "Out-of-scope items are named to control the solution",
    ],
  },
  {
    id: "core-entities",
    step: 2,
    title: "Core Entities",
    objective: "Name the key objects the system revolves around.",
    deliverable: "A small domain model with important relationships and ownership.",
    prompts: [
      "What are the primary records or resources in the system?",
      "Which entities are user-facing versus internal?",
      "What fields or relationships drive the hardest scaling choices?",
    ],
    reviewChecks: [
      "Entities map back to user actions",
      "Relationships and ownership are obvious",
      "The model supports the key access patterns",
    ],
  },
  {
    id: "api-interface",
    step: 3,
    title: "API or Interface",
    objective: "Translate the product contract into calls, events, or interfaces.",
    deliverable: "The core APIs, request flows, and data contracts.",
    prompts: [
      "What are the most important reads, writes, and mutations?",
      "What request or event contract would clients depend on?",
      "What idempotency, pagination, or versioning concerns appear early?",
    ],
    reviewChecks: [
      "Critical user journeys are covered by concrete interfaces",
      "The contract exposes the right identifiers and boundaries",
      "The API design anticipates scale-sensitive behavior",
    ],
  },
  {
    id: "data-flow",
    step: 4,
    title: "Data Flow",
    objective: "Explain how requests and events move through the system.",
    deliverable: "A step-by-step flow for writes, reads, and asynchronous work.",
    prompts: [
      "What happens on the hottest write path from ingress to storage?",
      "Where do queues, caches, or stream processors enter the flow?",
      "How does the read path behave under fan-out or hot-key pressure?",
    ],
    reviewChecks: [
      "Write and read flows are distinct where needed",
      "Async boundaries and retries are called out",
      "The flow supports the latency and throughput targets",
    ],
  },
  {
    id: "high-level-design",
    step: 5,
    title: "High-level Design",
    objective: "Present the architecture that satisfies the system goals.",
    deliverable: "A coherent component diagram with clear responsibilities.",
    prompts: [
      "What are the major services, stores, caches, and messaging layers?",
      "Why do these components exist, and what does each one own?",
      "How does the design satisfy the most important non-functional requirements?",
    ],
    reviewChecks: [
      "Every major box has a reason to exist",
      "Ownership boundaries are clean",
      "The architecture answers the primary scale constraints",
    ],
  },
  {
    id: "deep-dives",
    step: 6,
    title: "Deep Dives",
    objective: "Go deeper on the parts most likely to fail or scale poorly.",
    deliverable: "Focused tradeoff analysis on bottlenecks, failure modes, and evolution.",
    prompts: [
      "Where are the likely bottlenecks or consistency tradeoffs?",
      "How would you handle failure, observability, and back-pressure?",
      "What would you improve next if traffic grew 10x?",
    ],
    reviewChecks: [
      "Tradeoffs are explicit, not implied",
      "Failure handling and observability are covered",
      "The system has a credible scaling path",
    ],
  },
];

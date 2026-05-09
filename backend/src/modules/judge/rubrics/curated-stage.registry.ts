import type { ProblemContext, StageId } from "../../ai/contracts.js";
import type { RequirementCheck, StageRubric } from "../types.js";
import { getCuratedRequirementsRubric } from "./curated-requirements.registry.js";

const CURATED_STAGE_VERSION = "stage-curated-v1";

type CheckOptions = {
  importance?: RequirementCheck["importance"];
  requiresQuantification?: boolean;
  weight?: number;
};

const check = (
  id: string,
  label: string,
  keywords: string[],
  followUpQuestion: string,
  improvementSuggestion: string,
  options: CheckOptions = {},
): RequirementCheck => {
  const result: RequirementCheck = {
    id,
    label,
    weight: options.weight ?? 6,
    keywords,
    importance: options.importance ?? "critical",
    followUpQuestion,
    improvementSuggestion,
  };

  if (options.requiresQuantification !== undefined) {
    result.requiresQuantification = options.requiresQuantification;
  }

  return result;
};

const unique = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const collectDomainKeywords = (requirementsRubric: StageRubric): string[] => {
  const functionalKeywords = requirementsRubric.functional.flatMap((item) => [
    item.label,
    ...item.keywords,
  ]);

  return unique(functionalKeywords).slice(0, 80);
};

const collectRiskKeywords = (
  problem: ProblemContext,
  requirementsRubric: StageRubric,
): string[] =>
  unique([
    ...problem.pitfalls,
    ...requirementsRubric.functional
      .filter((item) => item.importance === "critical")
      .map((item) => item.label),
    "hot key",
    "bottleneck",
    "failure",
    "consistency",
    "backpressure",
  ]);

const baselineScopeChecks = (problem: ProblemContext): RequirementCheck[] => [
  check(
    "stage_scope_tradeoffs",
    "Scope boundaries and tradeoffs",
    [
      "tradeoff",
      "scope",
      "out of scope",
      "not in scope",
      "initial version",
      ...problem.interviewVariants,
    ],
    "Which parts are intentionally simplified or deferred at this stage?",
    "State scope boundaries and the tradeoffs behind them instead of implying every feature is included.",
    { importance: "important", weight: 5 },
  ),
];

const buildCoreEntitiesRubric = (
  problem: ProblemContext,
  requirementsRubric: StageRubric,
): StageRubric => {
  const domainKeywords = collectDomainKeywords(requirementsRubric);

  return {
    problemId: problem.id,
    stageId: "core-entities",
    version: `${CURATED_STAGE_VERSION}:${problem.id}:core-entities`,
    scoring: {
      functionalWeight: 45,
      nonFunctionalWeight: 30,
      specificityWeight: 10,
      scopeWeight: 10,
      problemAlignmentWeight: 5,
    },
    functional: [
      check(
        "domain_entities",
        "Problem-specific domain entities",
        domainKeywords,
        "Which domain entities are essential for the primary user flows?",
        "Name the problem-specific entities instead of only listing generic users or services.",
        { weight: 9 },
      ),
      check(
        "identifiers_ownership",
        "Identifiers and ownership",
        ["id", "identifier", "primary key", "owner", "tenant", "organizer", "creator"],
        "What uniquely identifies each entity, and who owns it?",
        "Add identifiers, ownership boundaries, tenant/user ownership, and lifecycle fields.",
      ),
      check(
        "relationships_cardinality",
        "Relationships and cardinality",
        ["relationship", "cardinality", "one-to-many", "many-to-many", "foreign key", "mapping"],
        "What are the high-value relationships and their cardinality?",
        "Explain entity relationships, cardinality, and join or lookup paths that matter at scale.",
      ),
      check(
        "access_patterns_indexes",
        "Access patterns and indexes",
        ["access pattern", "query", "lookup", "index", "secondary index", "sort key"],
        "Which queries must the data model support efficiently?",
        "Tie entities to read/write access patterns, indexes, and sort or partition keys.",
      ),
      check(
        "hot_entities_partitioning",
        "Hot entities and partition keys",
        ["partition", "shard", "hot", "write-heavy", "read-heavy", "scale"],
        "Which entities become hot at the stated scale?",
        "Call out heavy-read or heavy-write entities and the partitioning strategy they imply.",
      ),
    ],
    nonFunctional: [
      check(
        "data_sensitivity_lifecycle",
        "Data sensitivity and lifecycle",
        ["privacy", "security", "retention", "delete", "lifecycle", "audit"],
        "Which entities contain sensitive or long-retained data?",
        "Annotate sensitive entities, retention needs, deletion behavior, and audit requirements.",
        { importance: "important", weight: 5 },
      ),
      check(
        "normalization_denormalization",
        "Normalization and denormalization choices",
        ["normalize", "denormalize", "materialized", "duplicate", "projection"],
        "Where should the model normalize versus duplicate data for reads?",
        "Explain normalization tradeoffs and denormalized projections needed for hot reads.",
        { importance: "important", weight: 5 },
      ),
    ],
    scopeChecks: baselineScopeChecks(problem),
  };
};

const buildApiRubric = (
  problem: ProblemContext,
  requirementsRubric: StageRubric,
): StageRubric => {
  const domainKeywords = collectDomainKeywords(requirementsRubric);

  return {
    problemId: problem.id,
    stageId: "api-interface",
    version: `${CURATED_STAGE_VERSION}:${problem.id}:api-interface`,
    scoring: {
      functionalWeight: 45,
      nonFunctionalWeight: 30,
      specificityWeight: 10,
      scopeWeight: 10,
      problemAlignmentWeight: 5,
    },
    functional: [
      check(
        "critical_operations",
        "Problem-specific read and write operations",
        domainKeywords,
        "Which reads and writes cover the critical user journeys?",
        "Define APIs or events for the problem-specific operations, not only generic CRUD.",
        { weight: 9 },
      ),
      check(
        "request_response_contracts",
        "Request and response contracts",
        ["request", "response", "payload", "schema", "field", "contract", "body"],
        "What request and response fields do clients depend on?",
        "Add concrete request bodies, response shapes, required fields, and error responses.",
      ),
      check(
        "resource_identifiers",
        "Resource identifiers and boundaries",
        ["resource", "id", "identifier", "path", "tenant", "scope"],
        "Which identifiers appear in API paths, bodies, and events?",
        "Expose the right resource IDs, tenant boundaries, and ownership context in contracts.",
      ),
      check(
        "idempotency_retries",
        "Idempotency and safe retries",
        ["idempotency", "idempotency key", "retry", "duplicate", "dedupe"],
        "Which writes must be safe to retry?",
        "Add idempotency keys, duplicate handling, and retry semantics for mutating APIs.",
      ),
      check(
        "pagination_filtering_batching",
        "Pagination, filtering, and batching",
        ["pagination", "cursor", "page", "filter", "batch", "limit"],
        "Which reads can grow unbounded and need pagination?",
        "Add cursor pagination, filters, sorting, limits, and batching for high-volume reads.",
      ),
      check(
        "async_events_callbacks",
        "Async events and callbacks",
        ["event", "webhook", "callback", "queue", "async", "status"],
        "Which operations should be asynchronous instead of blocking clients?",
        "Separate synchronous APIs from events, callbacks, webhooks, or status polling.",
      ),
    ],
    nonFunctional: [
      check(
        "auth_validation_versioning",
        "Auth, validation, and versioning",
        ["auth", "authorization", "validation", "version", "backward compatible"],
        "How are contracts protected and evolved?",
        "Include auth checks, validation errors, API versioning, and backward-compatibility requirements.",
        { importance: "important", weight: 6 },
      ),
      check(
        "rate_limits_errors",
        "Rate limits and error semantics",
        ["rate limit", "quota", "429", "error", "timeout", "status code"],
        "How do clients behave under errors or quota pressure?",
        "Define rate limits, timeout behavior, status codes, and retryable versus terminal errors.",
        { importance: "important", weight: 5 },
      ),
    ],
    scopeChecks: baselineScopeChecks(problem),
  };
};

const buildDataFlowRubric = (
  problem: ProblemContext,
  requirementsRubric: StageRubric,
): StageRubric => {
  const domainKeywords = collectDomainKeywords(requirementsRubric);

  return {
    problemId: problem.id,
    stageId: "data-flow",
    version: `${CURATED_STAGE_VERSION}:${problem.id}:data-flow`,
    scoring: {
      functionalWeight: 45,
      nonFunctionalWeight: 30,
      specificityWeight: 10,
      scopeWeight: 10,
      problemAlignmentWeight: 5,
    },
    functional: [
      check(
        "domain_flow",
        "Problem-specific request/event flow",
        domainKeywords,
        "How does the core problem-specific action move through the system?",
        "Trace the core domain flow end-to-end using the problem-specific entities and operations.",
        { weight: 9 },
      ),
      check(
        "hot_write_path",
        "Hot write path",
        ["write path", "ingress", "api", "validate", "store", "commit", "durable"],
        "What happens on the hottest write path from client to durable storage?",
        "Describe ingress, validation, coordination, durable writes, and downstream side effects.",
      ),
      check(
        "hot_read_path",
        "Hot read path",
        ["read path", "query", "cache", "index", "lookup", "projection"],
        "What happens on the hottest read path?",
        "Describe cache/index/projection lookup, storage fallback, and response assembly.",
      ),
      check(
        "async_boundaries",
        "Async boundaries and background work",
        ["queue", "stream", "event", "worker", "background", "async"],
        "Where do queues, streams, workers, or background jobs enter the flow?",
        "Call out async boundaries, event contracts, worker processing, and eventual side effects.",
      ),
      check(
        "retries_dedupe_backpressure",
        "Retries, dedupe, and backpressure",
        ["retry", "dedupe", "idempotency", "backpressure", "dead letter"],
        "How does the flow handle duplicate events and overload?",
        "Add retry policy, idempotency, dedupe windows, backpressure, and dead-letter handling.",
      ),
    ],
    nonFunctional: [
      check(
        "consistency_latency",
        "Consistency and latency across the flow",
        ["consistency", "latency", "p95", "p99", "slo", "eventual"],
        "Where does the flow require strong consistency or low latency?",
        "Tie each flow segment to consistency expectations and latency targets.",
        { requiresQuantification: true, weight: 7 },
      ),
      check(
        "failure_paths",
        "Failure and degraded paths",
        ["failure", "timeout", "fallback", "degrade", "partial", "recovery"],
        "What happens when a dependency fails?",
        "Add timeout, fallback, recovery, replay, and partial-failure behavior.",
        { importance: "important", weight: 6 },
      ),
    ],
    scopeChecks: baselineScopeChecks(problem),
  };
};

const buildHighLevelDesignRubric = (
  problem: ProblemContext,
  requirementsRubric: StageRubric,
): StageRubric => {
  const domainKeywords = collectDomainKeywords(requirementsRubric);

  return {
    problemId: problem.id,
    stageId: "high-level-design",
    version: `${CURATED_STAGE_VERSION}:${problem.id}:high-level-design`,
    scoring: {
      functionalWeight: 45,
      nonFunctionalWeight: 35,
      specificityWeight: 5,
      scopeWeight: 10,
      problemAlignmentWeight: 5,
    },
    functional: [
      check(
        "domain_components",
        "Problem-specific components",
        [...domainKeywords, "service", "component", "worker", "gateway"],
        "Which components are required for this specific system?",
        "Name services and components that directly map to the problem domain and critical operations.",
        { weight: 9 },
      ),
      check(
        "ownership_boundaries",
        "Clean ownership boundaries",
        ["ownership", "boundary", "responsibility", "service", "domain"],
        "What does each major component own?",
        "Assign clear responsibilities and avoid component soup with overlapping ownership.",
      ),
      check(
        "storage_messaging_choices",
        "Storage, cache, index, and messaging choices",
        ["database", "storage", "cache", "queue", "stream", "index", "cdn"],
        "Which storage and messaging systems are needed and why?",
        "Justify data stores, caches, indexes, queues, streams, and CDN layers based on access patterns.",
      ),
      check(
        "scaling_partitioning",
        "Scaling and partitioning strategy",
        ["scale", "partition", "shard", "replication", "fan-out", "hot key"],
        "How does the design scale for the stated workload?",
        "Explain partitioning, replication, fan-out, hot-key handling, and capacity drivers.",
        { requiresQuantification: true },
      ),
      check(
        "reliability_security_observability",
        "Reliability, security, and observability",
        ["availability", "failover", "security", "monitoring", "metrics", "alerts"],
        "How does the architecture operate safely in production?",
        "Add failover, security controls, observability, alerting, and operational ownership.",
      ),
    ],
    nonFunctional: [
      check(
        "tradeoff_rationale",
        "Architecture tradeoff rationale",
        ["tradeoff", "why", "because", "alternative", "rationale"],
        "Why are these components the right tradeoff for the problem?",
        "Explain major alternatives and why each chosen component is justified.",
        { importance: "important", weight: 6 },
      ),
    ],
    scopeChecks: baselineScopeChecks(problem),
  };
};

const buildDeepDiveRubric = (
  problem: ProblemContext,
  requirementsRubric: StageRubric,
): StageRubric => {
  const riskKeywords = collectRiskKeywords(problem, requirementsRubric);

  return {
    problemId: problem.id,
    stageId: "deep-dives",
    version: `${CURATED_STAGE_VERSION}:${problem.id}:deep-dives`,
    scoring: {
      functionalWeight: 45,
      nonFunctionalWeight: 35,
      specificityWeight: 5,
      scopeWeight: 10,
      problemAlignmentWeight: 5,
    },
    functional: [
      check(
        "problem_specific_bottlenecks",
        "Problem-specific bottlenecks and risks",
        riskKeywords,
        "Which bottlenecks are most likely for this problem?",
        "Deep dive into the prompt-specific pitfalls, hot paths, and bottlenecks instead of generic scaling comments.",
        { weight: 9 },
      ),
      check(
        "consistency_correctness_tradeoffs",
        "Consistency and correctness tradeoffs",
        ["consistency", "correctness", "ordering", "idempotency", "race", "duplicate"],
        "Where can correctness fail under concurrency or retries?",
        "Explain consistency boundaries, race conditions, idempotency, duplicate handling, and ordering tradeoffs.",
      ),
      check(
        "failure_recovery",
        "Failure recovery",
        ["failure", "recovery", "failover", "timeout", "replay", "disaster"],
        "What happens when a key component or region fails?",
        "Cover failover, replay, recovery, disaster scenarios, and user-visible degradation.",
      ),
      check(
        "backpressure_overload",
        "Backpressure and overload control",
        ["backpressure", "rate limit", "load shed", "queue", "throttle", "hot key"],
        "How does the system behave under overload?",
        "Add throttling, queue limits, load shedding, hot-key mitigation, and overload safety.",
      ),
      check(
        "observability_slos",
        "Observability and SLOs",
        ["slo", "sla", "p95", "p99", "monitoring", "metrics", "alerts"],
        "How would operators detect and diagnose failures?",
        "Define SLOs, dashboards, alerts, traces, logs, and key debugging signals.",
        { requiresQuantification: true },
      ),
      check(
        "evolution_10x",
        "10x growth and evolution path",
        ["10x", "growth", "evolve", "migration", "future", "next"],
        "What changes when traffic or data grows by 10x?",
        "Describe the next scaling step, migration path, and which optimizations stay deferred until needed.",
        { importance: "important" },
      ),
    ],
    nonFunctional: [
      check(
        "capacity_cost",
        "Capacity and cost awareness",
        ["capacity", "cost", "storage", "compute", "qps", "throughput"],
        "What resource becomes expensive first?",
        "Tie the deep dive to capacity, cost, storage, compute, and throughput constraints.",
        { importance: "important", requiresQuantification: true, weight: 6 },
      ),
    ],
    scopeChecks: baselineScopeChecks(problem),
  };
};

export const getCuratedStageRubric = (
  problem: ProblemContext,
  stageId: StageId,
): StageRubric | null => {
  const requirementsRubric = getCuratedRequirementsRubric(problem);

  if (!requirementsRubric) {
    return null;
  }

  if (stageId === "requirements") {
    return requirementsRubric;
  }

  if (stageId === "core-entities") {
    return buildCoreEntitiesRubric(problem, requirementsRubric);
  }

  if (stageId === "api-interface") {
    return buildApiRubric(problem, requirementsRubric);
  }

  if (stageId === "data-flow") {
    return buildDataFlowRubric(problem, requirementsRubric);
  }

  if (stageId === "high-level-design") {
    return buildHighLevelDesignRubric(problem, requirementsRubric);
  }

  return buildDeepDiveRubric(problem, requirementsRubric);
};

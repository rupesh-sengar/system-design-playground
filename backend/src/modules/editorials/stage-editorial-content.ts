import { stageIds, type ProblemContext, type StageId } from "../ai/contracts.js";
import { getCuratedStageRubric } from "../judge/rubrics/curated-stage.registry.js";
import type { RequirementCheck, StageRubric } from "../judge/types.js";

export interface StageEditorialSeed {
  contentHtml: string;
  problemId: string;
  stageId: StageId;
  title: string;
}

type ArchitecturePreset = {
  background: string[];
  components: string[];
  stores: string[];
};

const stageLabels: Record<StageId, string> = {
  "api-interface": "API or Interface",
  "core-entities": "Core Entities",
  "data-flow": "Data Flow",
  "deep-dives": "Deep Dives",
  "high-level-design": "High-level Design",
  requirements: "Requirements",
};

const architectureByCategory: Record<string, ArchitecturePreset> = {
  AI: {
    background: [
      "embedding/model worker pool",
      "feature or metadata enrichment pipeline",
      "offline evaluation and monitoring jobs",
    ],
    components: [
      "API gateway",
      "serving service",
      "index/model registry service",
      "metadata service",
      "worker fleet",
      "observability pipeline",
    ],
    stores: [
      "metadata database",
      "vector/model artifact store",
      "cache for hot requests",
      "event stream for updates",
    ],
  },
  Collaboration: {
    background: [
      "activity feed projector",
      "notification worker",
      "search indexing worker",
    ],
    components: [
      "API gateway",
      "collaboration service",
      "permission service",
      "realtime gateway",
      "search service",
      "notification service",
    ],
    stores: [
      "transactional metadata database",
      "append-only activity log",
      "search index",
      "cache for hot boards/documents/calendars",
    ],
  },
  Commerce: {
    background: [
      "settlement/reconciliation worker",
      "fraud/risk worker",
      "status notification worker",
    ],
    components: [
      "API gateway",
      "checkout/payment/order service",
      "ledger or state machine service",
      "risk service",
      "webhook service",
      "operations console",
    ],
    stores: [
      "strongly consistent transactional database",
      "append-only ledger or event log",
      "idempotency store",
      "analytics warehouse",
    ],
  },
  Communication: {
    background: [
      "fan-out worker",
      "delivery retry worker",
      "search/indexing worker",
    ],
    components: [
      "API gateway",
      "connection or delivery service",
      "routing service",
      "preference/permission service",
      "provider adapter",
      "observability service",
    ],
    stores: [
      "message/event store",
      "recipient or channel metadata database",
      "ephemeral presence/cache store",
      "delivery status log",
    ],
  },
  Data: {
    background: [
      "ingestion worker",
      "indexing/aggregation worker",
      "backfill and compaction jobs",
    ],
    components: [
      "ingestion gateway",
      "query service",
      "stream processor",
      "index/aggregation service",
      "metadata service",
      "admin control plane",
    ],
    stores: [
      "append-only event log",
      "serving index",
      "metadata database",
      "object/warehouse storage for raw data",
    ],
  },
  Foundations: {
    background: [
      "cleanup worker",
      "analytics worker",
      "abuse scanning worker",
    ],
    components: [
      "API gateway",
      "core service",
      "metadata service",
      "redirect/read service",
      "worker fleet",
      "observability service",
    ],
    stores: [
      "primary metadata database",
      "cache for hot reads",
      "object/blob storage where payloads are large",
      "event stream for analytics",
    ],
  },
  Identity: {
    background: [
      "revocation propagation worker",
      "audit worker",
      "policy sync worker",
    ],
    components: [
      "auth gateway",
      "identity/session service",
      "policy service",
      "token service",
      "audit service",
      "admin console",
    ],
    stores: [
      "strongly consistent identity database",
      "session/token store with TTL",
      "audit log",
      "cache for policy reads",
    ],
  },
  Infrastructure: {
    background: [
      "health/check worker",
      "compaction or repair worker",
      "control-plane reconciler",
    ],
    components: [
      "control plane API",
      "data plane nodes",
      "metadata service",
      "scheduler/coordinator",
      "worker fleet",
      "observability service",
    ],
    stores: [
      "metadata database",
      "replicated log or queue",
      "object/segment storage",
      "cache for routing or metadata",
    ],
  },
  Media: {
    background: [
      "media processing/transcoding worker",
      "ranking or recommendation worker",
      "cache warming worker",
    ],
    components: [
      "API gateway",
      "metadata service",
      "media upload/ingest service",
      "feed/playback service",
      "CDN integration",
      "analytics service",
    ],
    stores: [
      "metadata database",
      "object storage for media",
      "CDN/edge cache",
      "search or recommendation index",
    ],
  },
  Mobility: {
    background: [
      "matching/optimization worker",
      "ETA/routing worker",
      "notification worker",
    ],
    components: [
      "API gateway",
      "location ingestion service",
      "matching/dispatch service",
      "trip/order state service",
      "geospatial query service",
      "notification service",
    ],
    stores: [
      "geospatial index",
      "transactional state database",
      "event stream for locations/status",
      "cache for active nearby state",
    ],
  },
  Platform: {
    background: [
      "configuration propagation worker",
      "audit worker",
      "analytics/aggregation worker",
    ],
    components: [
      "control plane API",
      "data plane service",
      "policy/config service",
      "metadata service",
      "worker fleet",
      "observability service",
    ],
    stores: [
      "metadata/config database",
      "cache for low-latency reads",
      "event stream for changes",
      "audit log",
    ],
  },
  Social: {
    background: [
      "fan-out worker",
      "ranking worker",
      "notification worker",
      "moderation worker",
    ],
    components: [
      "API gateway",
      "content service",
      "graph service",
      "feed/ranking service",
      "media service",
      "moderation service",
    ],
    stores: [
      "content database",
      "graph store",
      "feed cache/materialized timeline store",
      "search/ranking index",
    ],
  },
  Storage: {
    background: [
      "replication/repair worker",
      "lifecycle worker",
      "metadata compaction worker",
    ],
    components: [
      "API gateway",
      "metadata service",
      "storage node service",
      "replication coordinator",
      "sharing/permission service",
      "lifecycle service",
    ],
    stores: [
      "metadata database",
      "object/chunk store",
      "replicated placement log",
      "cache for hot metadata",
    ],
  },
};

const defaultArchitecture: ArchitecturePreset = {
  background: ["worker fleet", "analytics worker", "cleanup worker"],
  components: [
    "API gateway",
    "core domain service",
    "metadata service",
    "worker service",
    "observability service",
  ],
  stores: [
    "primary database",
    "cache for hot reads",
    "event stream",
    "analytics store",
  ],
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => {
    if (character === "&") {
      return "&amp;";
    }

    if (character === "<") {
      return "&lt;";
    }

    if (character === ">") {
      return "&gt;";
    }

    if (character === '"') {
      return "&quot;";
    }

    return "&#39;";
  });

const unique = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const sentenceCase = (value: string): string => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return trimmedValue;
  }

  return `${trimmedValue.charAt(0).toUpperCase()}${trimmedValue.slice(1)}`;
};

const asSentence = (value: string): string => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return trimmedValue;
  }

  if (/[.!?]$/.test(trimmedValue)) {
    return sentenceCase(trimmedValue);
  }

  return `${sentenceCase(trimmedValue)}.`;
};

const checkToExpectation = (check: RequirementCheck): string =>
  asSentence(check.improvementSuggestion);

const limit = (values: string[], count: number): string[] =>
  unique(values).slice(0, count);

const renderList = (items: string[]): string =>
  `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;

const renderSection = (heading: string, items: string[]): string =>
  `<h3>${escapeHtml(heading)}</h3>${renderList(items)}`;

const renderParagraph = (value: string): string =>
  `<p>${escapeHtml(value)}</p>`;

const getArchitecturePreset = (problem: ProblemContext): ArchitecturePreset =>
  architectureByCategory[problem.category] ?? defaultArchitecture;

const getRubric = (problem: ProblemContext, stageId: StageId): StageRubric => {
  const rubric = getCuratedStageRubric(problem, stageId);

  if (!rubric) {
    throw new Error(
      `Missing curated rubric for ${problem.id}:${stageId}. Editorials must match judge expectations.`,
    );
  }

  return rubric;
};

const importantChecks = (checks: RequirementCheck[], count: number): string[] =>
  limit(
    checks
      .sort((left, right) => {
        const importanceRank = {
          critical: 3,
          important: 2,
          "nice-to-have": 1,
        };
        const rankDelta =
          importanceRank[right.importance] - importanceRank[left.importance];

        return rankDelta || right.weight - left.weight;
      })
      .map(checkToExpectation),
    count,
  );

const requirementLabels = (rubric: StageRubric, count = 5): string[] =>
  limit(rubric.functional.map((check) => check.label), count);

const operationNames = (rubric: StageRubric, count = 5): string[] =>
  limit(
    rubric.functional.map((check) =>
      check.id
        .split("_")
        .filter(Boolean)
        .map((token) => token.toLowerCase())
        .join("-"),
    ),
    count,
  );

const focusAreas = (problem: ProblemContext, count = 4): string[] =>
  limit(problem.focusAreas, count);

const pitfalls = (problem: ProblemContext, count = 3): string[] =>
  limit(problem.pitfalls, count);

const variants = (problem: ProblemContext, count = 3): string[] =>
  limit(problem.interviewVariants, count);

const renderExpectedSolution = (
  problem: ProblemContext,
  stageId: StageId,
  sections: string[],
): StageEditorialSeed => ({
  contentHtml: [
    renderParagraph(
      `This is the expected ${stageLabels[
        stageId
      ].toLowerCase()} solution direction for ${problem.title}. It is written as the problem-setter answer, not as hints.`,
    ),
    renderParagraph(`Scale assumption: ${problem.scale}`),
    ...sections,
  ].join(""),
  problemId: problem.id,
  stageId,
  title: `Expected ${stageLabels[stageId]} solution: ${problem.title}`,
});

const buildRequirementsEditorial = (
  problem: ProblemContext,
  rubric: StageRubric,
): StageEditorialSeed =>
  renderExpectedSolution(problem, "requirements", [
    renderSection(
      "Functional requirements expected",
      importantChecks(rubric.functional, 7),
    ),
    renderSection(
      "Non-functional requirements expected",
      importantChecks(rubric.nonFunctional, 6),
    ),
    renderSection("Explicitly acceptable deferrals", [
      ...variants(problem).map(
        (variant) => `${variant} can be deferred unless the interviewer asks for it.`,
      ),
      "Advanced admin tooling, offline backfills, and full analytics are follow-ups unless they are central to the prompt.",
    ]),
    renderSection("Correctness bar", [
      "The answer should separate must-have behavior from optional extensions before choosing infrastructure.",
      "The stated scale must drive latency, availability, consistency, storage, and abuse-control targets.",
      "Any requirement tied to money, identity, security, ordering, or user-visible state must name the expected consistency boundary.",
    ]),
  ]);

const buildCoreEntitiesEditorial = (
  problem: ProblemContext,
  rubric: StageRubric,
): StageEditorialSeed => {
  const expectedRequirements = requirementLabels(rubric);

  return renderExpectedSolution(problem, "core-entities", [
    renderSection("Core domain entities expected", [
      "Account/User or Tenant: owns requests, permissions, preferences, and quota boundaries.",
      `${problem.title} Resource: the primary durable object behind ${expectedRequirements
        .slice(0, 3)
        .join(", ")}.`,
      "Operation/Request: immutable record for creates, updates, retries, and idempotency.",
      "Relationship/Mapping entity: captures ownership, membership, graph edges, subscriptions, assignments, or visibility links.",
      "State/Status record: tracks lifecycle transitions, async progress, failures, retries, and user-visible status.",
      "Audit/Event record: append-only history for analytics, debugging, reconciliation, and compliance.",
    ]),
    renderSection("Fields and indexes expected", [
      "Every entity should have a stable ID, owner/tenant ID, createdAt, updatedAt, lifecycle status, and version where concurrent updates matter.",
      `Index around the hot access patterns implied by ${expectedRequirements.join(", ")}.`,
      "Use composite keys that include tenant/user/partition context before time or status when reads are scoped.",
      "Keep large blobs or media in object storage and store only metadata and references in transactional tables.",
      "Separate ephemeral state from durable records when low latency or TTL cleanup matters.",
    ]),
    renderSection("Data-model tradeoffs expected", [
      `Partition or shard the hottest entity because the prompt scale is ${problem.scale}.`,
      "Use denormalized projections for hot reads, but keep a source-of-truth table or log for correctness.",
      `Explicitly handle ${pitfalls(problem).join(", ")} in the entity model.`,
      "For many-to-many relationships, avoid unbounded joins on the critical path by materializing read-optimized views.",
    ]),
  ]);
};

const buildApiEditorial = (
  problem: ProblemContext,
  rubric: StageRubric,
): StageEditorialSeed => {
  const operations = operationNames(rubric);

  return renderExpectedSolution(problem, "api-interface", [
    renderSection("External APIs expected", [
      `POST /v1/${problem.id}/requests: creates the primary mutation with an Idempotency-Key header and returns a durable request/resource ID.`,
      `GET /v1/${problem.id}/resources/{id}: fetches the current user-visible state for the primary resource.`,
      `GET /v1/${problem.id}/resources?cursor=&limit=&filters=: lists resources with cursor pagination and bounded filters.`,
      `PATCH /v1/${problem.id}/resources/{id}: updates mutable fields with authorization, version checks, and validation errors.`,
      `DELETE /v1/${problem.id}/resources/{id}: cancels, deletes, revokes, or tombstones the resource according to the problem domain.`,
    ]),
    renderSection("Problem-specific operations expected", [
      ...operations.map(
        (operation) =>
          `Expose a ${operation} command/query or event because it maps to an expected requirement.`,
      ),
      "For high-volume reads, prefer cursor pagination, filters, and client-visible freshness metadata.",
      "For slow or fan-out-heavy work, return accepted/status and publish an internal event instead of blocking the client.",
    ]),
    renderSection("Internal events expected", [
      `${problem.id}.resource.created with resourceId, actorId, tenantId, idempotencyKey, occurredAt, and version.`,
      `${problem.id}.resource.updated with changed fields, previousVersion, newVersion, and reason.`,
      `${problem.id}.resource.failed or dead-lettered with retry count, failure code, and replay metadata.`,
      "Consumers must be idempotent and use the event ID/resource version as the dedupe key.",
    ]),
    renderSection("Contract guarantees expected", [
      "Mutating APIs should be idempotent, authenticated, authorized, rate limited, and validated.",
      "Errors should distinguish validation failure, permission failure, not found, conflict, rate limit, and retryable dependency failure.",
      "The API should not leak storage topology; it should expose domain IDs and state transitions.",
      `The contract must explicitly address ${pitfalls(problem).join(", ")}.`,
    ]),
  ]);
};

const buildDataFlowEditorial = (
  problem: ProblemContext,
  rubric: StageRubric,
): StageEditorialSeed => {
  const expectedRequirements = requirementLabels(rubric, 4);
  const architecture = getArchitecturePreset(problem);

  return renderExpectedSolution(problem, "data-flow", [
    renderSection("Expected write path", [
      "Client sends authenticated request through gateway where auth, quota, validation, and idempotency are checked.",
      "Core service loads the current resource or policy state, validates the command, and writes the source-of-truth transaction.",
      "The write commits before any non-critical side effects are acknowledged to the user.",
      "An outbox/event log entry is written atomically with the main state change and later published to the stream.",
      `${architecture.background.join(", ")} consume the event for projections, notifications, analytics, cleanup, or provider calls.`,
    ]),
    renderSection("Expected read path", [
      "Gateway authenticates and routes the request to the serving/query service.",
      "Serving service first checks a cache or materialized projection for the hot read.",
      "On miss, it reads from the source store or index, assembles the response, and refreshes the cache with an appropriate TTL.",
      `Reads needed for ${expectedRequirements.join(", ")} should have bounded pagination and stable sort order.`,
      "Responses should include enough state/version/freshness metadata for clients to reason about eventual consistency.",
    ]),
    renderSection("Async and retry behavior expected", [
      "Workers use leases or consumer offsets so failed work can be retried without losing events.",
      "Retries use exponential backoff and a bounded retry count before dead-lettering.",
      "Every side effect has a dedupe key derived from request ID, event ID, or resource version.",
      "Back-pressure should slow producers, shed low-priority work, or degrade optional features before corrupting core state.",
    ]),
    renderSection("Failure cases expected", [
      `The flow should explain how it handles ${pitfalls(problem).join(", ")}.`,
      "If the cache, queue, index, or provider is unavailable, the user-visible behavior should be explicit.",
      "Operators should monitor p95/p99 latency, queue lag, retry rate, dead letters, cache hit rate, and correctness drift.",
    ]),
  ]);
};

const buildHighLevelDesignEditorial = (
  problem: ProblemContext,
  rubric: StageRubric,
): StageEditorialSeed => {
  const architecture = getArchitecturePreset(problem);

  return renderExpectedSolution(problem, "high-level-design", [
    renderSection("Expected components", [
      ...architecture.components.map(
        (component) => `${component}: owns a clear part of the ${problem.title} workflow.`,
      ),
      "Admin/control-plane surface: manages policies, rules, rollout safety, or operational overrides where needed.",
    ]),
    renderSection("Expected stores", [
      ...architecture.stores.map(
        (store) => `${store}: selected because it matches one of the hot access patterns.`,
      ),
      "Idempotency/dedupe store: protects mutating requests and async consumers from duplicate work.",
    ]),
    renderSection("Expected architecture flow", [
      "Clients enter through gateway/auth/rate-limit before reaching the domain service.",
      "The domain service owns validation and source-of-truth writes, not the worker fleet.",
      "Read-heavy views are served from caches, indexes, or materialized projections while the primary store remains authoritative.",
      "Queues/streams connect committed writes to background work and isolate slow dependencies from user-facing latency.",
      "Observability, audit, and operational controls are first-class components rather than afterthoughts.",
    ]),
    renderSection("Scaling and reliability expected", [
      `Partition by tenant/user/resource/time as appropriate for ${problem.scale}.`,
      `Mitigate ${pitfalls(problem).join(", ")} with sharding, hot-key isolation, caching, batching, or queue back-pressure.`,
      "Replicate source-of-truth data and define failover behavior before claiming high availability.",
      "Prefer clear ownership boundaries over a single service that owns API, state, fan-out, indexing, and analytics.",
    ]),
    renderSection("Tradeoff expected", [
      `A strong solution explains why the chosen architecture is enough for ${focusAreas(problem).join(", ")}.`,
      "It should also name what remains eventual, approximate, stale, or manually repairable.",
      "It should avoid adding global coordination unless the problem requires strong correctness.",
    ]),
  ]);
};

const buildDeepDivesEditorial = (
  problem: ProblemContext,
  rubric: StageRubric,
): StageEditorialSeed =>
  renderExpectedSolution(problem, "deep-dives", [
    renderSection("Expected bottleneck deep dives", [
      ...pitfalls(problem).map(
        (pitfall) =>
          `${sentenceCase(pitfall)}: identify the trigger, affected component, user-visible symptom, and mitigation.`,
      ),
      `Capacity should be reasoned from ${problem.scale}, not from vague "horizontal scaling" claims.`,
      "The answer should pick one hot path and explain the first resource that saturates.",
    ]),
    renderSection("Expected correctness tradeoffs", [
      "Define where the system requires strong consistency and where eventual consistency is acceptable.",
      "Use idempotency keys, versions, leases, dedupe windows, or compare-and-swap for concurrent writes and retries.",
      "Explain how duplicate, delayed, reordered, or missing events are detected and repaired.",
      "For user-visible state, describe whether users see pending, stale, failed, or confirmed status.",
    ]),
    renderSection("Expected failure handling", [
      "Dependency timeouts should have fallback, retry, circuit-breaker, or degradation behavior.",
      "Queue overload should trigger back-pressure, priority handling, load shedding, or delayed processing.",
      "Recovery should include replay/backfill, dead-letter inspection, reconciliation, and data repair.",
      "Regional failure should specify whether traffic fails over actively, passively, or with reduced functionality.",
    ]),
    renderSection("Expected observability", [
      "Track p95/p99 latency, error rate, saturation, queue lag, retry rate, dead-letter count, cache hit rate, and provider failure rate.",
      "Track domain correctness metrics that match the problem, such as duplicate operations, stale projections, dropped events, or reconciliation drift.",
      "Alerts should page on user-impacting symptoms and leave low-priority analytics lag as ticket-level alerts.",
    ]),
    renderSection("Expected evolution path", [
      ...variants(problem).map(
        (variant) =>
          `${variant}: describe the additive component or schema change needed without breaking the first-version contract.`,
      ),
      "At 10x traffic, split the hottest service/store boundary first, then add specialized indexes, regionalization, or async precomputation.",
      "The migration path should preserve API compatibility and replay historical events or backfill projections where needed.",
    ]),
    renderSection(
      "Judge criteria this deep dive should satisfy",
      importantChecks([...rubric.functional, ...rubric.nonFunctional], 6),
    ),
  ]);

const buildStageEditorial = (
  problem: ProblemContext,
  stageId: StageId,
): StageEditorialSeed => {
  const rubric = getRubric(problem, stageId);

  if (stageId === "requirements") {
    return buildRequirementsEditorial(problem, rubric);
  }

  if (stageId === "core-entities") {
    return buildCoreEntitiesEditorial(problem, rubric);
  }

  if (stageId === "api-interface") {
    return buildApiEditorial(problem, rubric);
  }

  if (stageId === "data-flow") {
    return buildDataFlowEditorial(problem, rubric);
  }

  if (stageId === "high-level-design") {
    return buildHighLevelDesignEditorial(problem, rubric);
  }

  return buildDeepDivesEditorial(problem, rubric);
};

export const buildStageEditorialSeeds = (
  problems: ProblemContext[],
): StageEditorialSeed[] =>
  problems.flatMap((problem) =>
    stageIds.map((stageId) => buildStageEditorial(problem, stageId)),
  );

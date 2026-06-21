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

const stageIntroLabels: Record<StageId, string> = {
  "api-interface": "API/interface",
  "core-entities": "core entities",
  "data-flow": "data flow",
  "deep-dives": "deep dives",
  "high-level-design": "high-level design",
  requirements: "requirements",
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

const limit = (values: string[], count: number): string[] =>
  unique(values).slice(0, count);

const renderList = (items: string[]): string =>
  `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;

const renderSection = (heading: string, items: string[]): string =>
  `<h3>${escapeHtml(heading)}</h3>${renderList(items)}`;

const renderParagraph = (value: string): string =>
  `<p>${escapeHtml(value)}</p>`;

const renderCodeBlock = (value: string): string =>
  `<pre><code>${escapeHtml(value.trim())}</code></pre>`;

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
    [...checks]
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
      .map(checkToSolutionLine),
    count,
  );

const focusAreas = (problem: ProblemContext, count = 4): string[] =>
  limit(problem.focusAreas, count);

const pitfalls = (problem: ProblemContext, count = 3): string[] =>
  limit(problem.pitfalls, count);

const variants = (problem: ProblemContext, count = 3): string[] =>
  limit(problem.interviewVariants, count);

const lowerFirst = (value: string): string => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return trimmedValue;
  }

  return `${trimmedValue.charAt(0).toLowerCase()}${trimmedValue.slice(1)}`;
};

const solutionPhraseReplacements: Array<[RegExp, string]> = [
  [/^add\s+/i, "includes "],
  [/^annotate\s+/i, "annotates "],
  [/^call out\s+/i, "calls out "],
  [/^cover\s+/i, "covers "],
  [/^decide on\s+/i, "sets scope for "],
  [/^define\s+/i, "defines "],
  [/^describe\s+/i, "describes "],
  [/^explain\s+/i, "explains "],
  [/^include\s+/i, "includes "],
  [/^name\s+/i, "names "],
  [/^quantify\s+/i, "quantifies "],
  [/^require\s+/i, "requires "],
  [/^separate\s+/i, "separates "],
  [/^specify\s+/i, "specifies "],
  [/^state\s+/i, "states "],
  [/^tie\s+/i, "ties "],
];

const stripTerminalPunctuation = (value: string): string =>
  value.trim().replace(/[.!?]+$/g, "");

const toSolutionPhrase = (value: string): string => {
  const sentence = asSentence(value).replace(/\.{2,}/g, ".");
  const replacement = solutionPhraseReplacements.find(([pattern]) =>
    pattern.test(sentence),
  );

  if (!replacement) {
    return sentence;
  }

  const [pattern, prefix] = replacement;

  return sentenceCase(sentence.replace(pattern, prefix));
};

const checkToSolutionLine = (check: RequirementCheck): string =>
  `${check.label}: ${toSolutionPhrase(check.improvementSuggestion)}`;

const deferredVariant = (variant: string): string => {
  const scope = variant
    .replace(/^(add|build|expose|handle|provide|support)\s+/i, "")
    .trim();

  return `Deferred: ${sentenceCase(
    stripTerminalPunctuation(scope || variant),
  )}, unless the interviewer explicitly asks for it.`;
};

const toKebabCase = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toCamelIdentifier = (value: string): string => {
  const words = toKebabCase(value).split("-").filter(Boolean);
  const firstWord = words[0];

  if (!firstWord) {
    return "resource";
  }

  return [
    firstWord,
    ...words
      .slice(1)
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`),
  ].join("");
};

const toPascalIdentifier = (value: string): string => {
  const camelIdentifier = toCamelIdentifier(value);

  return `${camelIdentifier.charAt(0).toUpperCase()}${camelIdentifier.slice(1)}`;
};

const toTitleCase = (value: string): string =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");

const domainName = (problem: ProblemContext): string =>
  problem.title
    .replace(/^Design\s+/i, "")
    .replace(/^(a|an|the)\s+/i, "")
    .trim()
    .toLowerCase();

const singularizeWord = (word: string): string => {
  if (word.endsWith("ies") && word.length > 4) {
    return `${word.slice(0, -3)}y`;
  }

  if (
    word.endsWith("ses") ||
    word.endsWith("xes") ||
    word.endsWith("zes") ||
    word.endsWith("ches") ||
    word.endsWith("shes")
  ) {
    return word.slice(0, -2);
  }

  if (word.endsWith("s") && !word.endsWith("ss") && word !== "status") {
    return word.slice(0, -1);
  }

  return word;
};

const singularizePhrase = (value: string): string => {
  const words = value.split(/\s+/).filter(Boolean);
  const lastWord = words[words.length - 1];

  if (!lastWord) {
    return value;
  }

  return [...words.slice(0, -1), singularizeWord(lastWord)].join(" ");
};

const leadingRequirementWords = new Set([
  "add",
  "append",
  "build",
  "capture",
  "collect",
  "consume",
  "create",
  "define",
  "deliver",
  "distributed",
  "edge",
  "evaluate",
  "execute",
  "expose",
  "fast",
  "fetch",
  "generate",
  "handle",
  "high",
  "ingest",
  "low",
  "low-latency",
  "manage",
  "multi",
  "multi-channel",
  "persist",
  "prefix",
  "process",
  "publish",
  "query",
  "real-time",
  "retrieve",
  "return",
  "route",
  "schedule",
  "send",
  "serve",
  "store",
  "support",
  "track",
  "update",
  "validate",
]);

const requirementSubject = (label: string): string => {
  const words = label
    .replace(/[/&]/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  while (words.length > 1 && leadingRequirementWords.has(words[0] ?? "")) {
    words.shift();
  }

  return words.join(" ");
};

const isReadOperation = (label: string): boolean =>
  /\b(fetch|get|list|lookup|query|read|redirect|resolve|retrieve|search|serve|suggestion|timeline|feed|dashboard)\b/i.test(
    label,
  );

const methodForOperation = (label: string): string => {
  if (/\b(delete|expire|logout|purge|revoke|takedown)\b/i.test(label)) {
    return "DELETE";
  }

  if (/\b(update|edit|patch|rollback|transition)\b/i.test(label)) {
    return "PATCH";
  }

  if (isReadOperation(label)) {
    return "GET";
  }

  return "POST";
};

const eventActionForOperation = (label: string): string => {
  if (
    /\b(create|append|ingest|publish|send|enqueue|upload|post)\b/i.test(label)
  ) {
    return "created";
  }

  if (/\b(delete|expire|logout|purge|revoke|takedown)\b/i.test(label)) {
    return "removed";
  }

  if (/\b(update|edit|patch|transition|rollback)\b/i.test(label)) {
    return "updated";
  }

  if (isReadOperation(label)) {
    return "served";
  }

  return "completed";
};

const readOperationContractText =
  " Request uses path/query identifiers plus authenticated tenant scope; response returns resource state, freshness, version, and cacheability metadata. Return cursor metadata for repeated reads.";

const writeOperationContractText =
  " Request includes actorId, tenantId, idempotencyKey, domain payload, optional conditional version, and client timestamp; response returns status, resource id, version, and retryable error details. Require an Idempotency-Key for safe retries.";

type SolutionProfile = {
  architecture: ArchitecturePreset;
  domain: string;
  domainTitle: string;
  focus: string[];
  operations: RequirementCheck[];
  primaryOperation: RequirementCheck;
  primaryResource: string;
  primaryResourcePath: string;
  primaryResourcePlural: string;
  primaryResourceTitle: string;
  readOperation: RequirementCheck;
  risks: string[];
  variants: string[];
};

const derivedDomainFields = (profile: SolutionProfile): string[] =>
  limit(
    [
      ...profile.focus,
      ...profile.operations.map((operation) =>
        requirementSubject(operation.label),
      ),
    ].map((value) => toCamelIdentifier(singularizePhrase(value))),
    5,
  );

const urlShortenerEntitySchemaCode = `type ISODateTime = string;

type ShortLinkStatus = "active" | "expired" | "disabled" | "blocked";

type ShortLink = {
  shortLinkId: string;
  tenantId: string;
  ownerId: string;
  longUrl: string;
  slug: string;
  customAlias?: string;
  shortUrl: string;
  status: ShortLinkStatus;
  expiresAt?: ISODateTime;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  version: number;
};

type RedirectEvent = {
  eventId: string;
  shortLinkId: string;
  slug: string;
  referrer?: string;
  userAgent?: string;
  ipHash: string;
  country?: string;
  occurredAt: ISODateTime;
};

type SlugReservation = {
  slug: string;
  shortLinkId: string;
  reservedAt: ISODateTime;
};`;

const buildEntitySchemaCode = (
  problem: ProblemContext,
  profile: SolutionProfile,
): string => {
  if (problem.id === "url-shortener") {
    return urlShortenerEntitySchemaCode;
  }

  const resourceType = toPascalIdentifier(profile.primaryResource);
  const resourceIdField = `${toCamelIdentifier(profile.primaryResource)}Id`;
  const domainFields = derivedDomainFields(profile)
    .map((field) => `  ${field}: string;`)
    .join("\n");

  return `type ISODateTime = string;

type ${resourceType}Status =
  | "pending"
  | "active"
  | "failed"
  | "disabled"
  | "deleted";

type ${resourceType} = {
  ${resourceIdField}: string;
  tenantId: string;
  ownerId: string;
  status: ${resourceType}Status;
  version: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  expiresAt?: ISODateTime;
${domainFields}
};

type ${resourceType}Operation = {
  requestId: string;
  idempotencyKey: string;
  ${resourceIdField}: string;
  actorId: string;
  operationType: string;
  payloadHash: string;
  status: "accepted" | "committed" | "rejected" | "retrying" | "dead_lettered";
  retryCount: number;
  errorCode?: string;
  createdAt: ISODateTime;
};

type ${resourceType}Event = {
  eventId: string;
  ${resourceIdField}: string;
  tenantId: string;
  actorId: string;
  eventType: string;
  previousVersion: number;
  newVersion: number;
  occurredAt: ISODateTime;
};`;
};

const buildSolutionProfile = (
  problem: ProblemContext,
  requirementsRubric: StageRubric,
): SolutionProfile => {
  const operations = requirementsRubric.functional;
  const fallbackOperation: RequirementCheck = {
    followUpQuestion: "What is the main workflow?",
    id: `${problem.id}_primary_operation`,
    importance: "critical",
    improvementSuggestion: problem.summary,
    keywords: problem.focusAreas,
    label: problem.summary,
    weight: 6,
  };
  const primaryOperation = operations[0] ?? fallbackOperation;
  const readOperation =
    operations.find((operation) => isReadOperation(operation.label)) ??
    operations[1] ??
    primaryOperation;
  const primaryResourcePlural =
    requirementSubject(primaryOperation.label) || domainName(problem);
  const primaryResource = singularizePhrase(primaryResourcePlural);

  return {
    architecture: getArchitecturePreset(problem),
    domain: domainName(problem),
    domainTitle: toTitleCase(domainName(problem)),
    focus: focusAreas(problem),
    operations,
    primaryOperation,
    primaryResource,
    primaryResourcePath: toKebabCase(primaryResourcePlural || problem.id),
    primaryResourcePlural,
    primaryResourceTitle: toTitleCase(primaryResource),
    readOperation,
    risks: pitfalls(problem),
    variants: variants(problem),
  };
};

const operationContract = (
  problem: ProblemContext,
  profile: SolutionProfile,
  operation: RequirementCheck,
): string => {
  const method = methodForOperation(operation.label);
  const subject =
    requirementSubject(operation.label) || profile.primaryResourcePlural;
  const path = toKebabCase(subject);
  const route =
    method === "GET"
      ? `/v1/${problem.id}/${path}/{id-or-key}`
      : `/v1/${problem.id}/${path}`;
  const contractText =
    method === "GET" ? readOperationContractText : writeOperationContractText;

  return `${method} ${route}: ${lowerFirst(operation.label)}.${contractText}`;
};

const eventContract = (
  problem: ProblemContext,
  profile: SolutionProfile,
  operation: RequirementCheck,
): string => {
  const subject = toKebabCase(
    requirementSubject(operation.label) || profile.primaryResource,
  );
  const eventName = `${problem.id}.${subject}.${eventActionForOperation(
    operation.label,
  )}`.replace(/-/g, ".");

  return `${eventName}: carries eventId, ${toCamelIdentifier(
    profile.primaryResource,
  )}Id, actorId, tenantId, occurredAt, version, idempotencyKey, and enough domain fields for consumers to rebuild projections.`;
};

const operationRoute = (
  problem: ProblemContext,
  profile: SolutionProfile,
  operation: RequirementCheck,
): string => {
  const method = methodForOperation(operation.label);
  const subject =
    requirementSubject(operation.label) || profile.primaryResourcePlural;
  const path = toKebabCase(subject);

  return method === "GET"
    ? `${method} /v1/${problem.id}/${path}/{idOrKey}`
    : `${method} /v1/${problem.id}/${path}`;
};

const buildSamplePayload = (
  profile: SolutionProfile,
  operation: RequirementCheck,
): Record<string, unknown> => {
  const fields = limit(
    [
      ...operation.keywords,
      ...derivedDomainFields(profile),
      ...profile.focus,
    ].map((value) => toCamelIdentifier(singularizePhrase(value))),
    4,
  ).filter(
    (field) => {
      const normalizedField = field.toLowerCase();

      return ![
        "cache",
        "caching",
        "generation",
        "handling",
        "lookup",
        "resolution",
        "scale",
        "uniqueness",
      ].some((fragment) => normalizedField.includes(fragment));
    },
  );
  const actionField = toCamelIdentifier(
    requirementSubject(operation.label) || operation.id,
  );

  return Object.fromEntries(
    unique([...fields, actionField])
      .slice(0, 5)
      .map((field) => [field, sampleValueForField(field)]),
  );
};

const sampleValueForField = (field: string): unknown => {
  const normalizedField = field.toLowerCase();

  if (normalizedField.includes("amount") || normalizedField.includes("count")) {
    return 100;
  }

  if (normalizedField.includes("policy")) {
    return "default-policy";
  }

  if (normalizedField.includes("limit")) {
    return 50;
  }

  if (normalizedField.includes("version")) {
    return 7;
  }

  if (normalizedField.includes("expires") || normalizedField.includes("time")) {
    return "2026-07-21T10:00:00Z";
  }

  if (normalizedField.includes("email")) {
    return "user@example.com";
  }

  if (normalizedField.includes("phone") || normalizedField.includes("sms")) {
    return "+15551234567";
  }

  if (normalizedField.includes("url")) {
    return normalizedField.includes("short")
      ? "https://sho.rt/aB9x"
      : "https://example.com/articles/system-design?ref=interview";
  }

  if (normalizedField.includes("slug") || normalizedField.includes("alias")) {
    return "summer-sale";
  }

  if (normalizedField.includes("lat")) {
    return 37.7749;
  }

  if (normalizedField.includes("lon") || normalizedField.includes("lng")) {
    return -122.4194;
  }

  if (normalizedField.includes("status")) {
    return "active";
  }

  if (normalizedField === "id" || normalizedField.endsWith("id")) {
    return `${field}_123`;
  }

  return `sample ${field}`;
};

const buildApiOperationCode = (
  problem: ProblemContext,
  profile: SolutionProfile,
  operation: RequirementCheck,
): string => {
  const route = operationRoute(problem, profile, operation);
  const method = route.split(" ")[0] ?? "GET";
  const resourceIdField = `${toCamelIdentifier(profile.primaryResource)}Id`;
  const payload = buildSamplePayload(profile, operation);

  if (method === "GET") {
    return `${route}
Query:
{
  "tenantId": "tenant_123",
  "actorId": "user_123",
  "cursor": "optional_cursor",
  "limit": 50
}
Response 200:
{
  "${resourceIdField}": "${toCamelIdentifier(profile.primaryResource)}_123",
  "tenantId": "tenant_123",
  "status": "active",
  "version": 7,
  "freshness": "cache_hit|source_read",
  "data": ${JSON.stringify(payload, null, 2).replace(/\n/g, "\n  ")}
}`;
  }

  return `${route}
Headers:
{
  "Authorization": "Bearer <access_token>",
  "Idempotency-Key": "req_01J..."
}
Request:
{
  "tenantId": "tenant_123",
  "actorId": "user_123",
  "expectedVersion": 6,
  "payload": ${JSON.stringify(payload, null, 2).replace(/\n/g, "\n  ")}
}
Response ${method === "POST" ? "201" : "200"}:
{
  "${resourceIdField}": "${toCamelIdentifier(profile.primaryResource)}_123",
  "status": "active",
  "version": 7,
  "operationId": "op_123",
  "acceptedAt": "2026-06-21T10:00:00Z"
}`;
};

const getRuntimeOperation = (profile: SolutionProfile): RequirementCheck =>
  profile.operations.find((operation) =>
    /\b(check|deliver|enforce|enforcement|evaluate|execute|fetch|generate|ingest|publish|query|read|resolve|route|search|send|serve|validate)\b/i.test(
      operation.label,
    ),
  ) ??
  profile.operations[1] ??
  profile.primaryOperation;

const buildGenericApiSpecCode = (
  problem: ProblemContext,
  profile: SolutionProfile,
): string => {
  const resourceIdField = `${toCamelIdentifier(profile.primaryResource)}Id`;
  const resourceIdValue = `${toCamelIdentifier(profile.primaryResource)}_123`;
  const runtimeOperation = getRuntimeOperation(profile);
  const runtimeAction = toKebabCase(
    requirementSubject(runtimeOperation.label) || "execute",
  );
  const createPayload = buildSamplePayload(profile, profile.primaryOperation);
  const runtimePayload = buildSamplePayload(profile, runtimeOperation);

  return `POST /v1/${problem.id}/${profile.primaryResourcePath}
Headers:
{
  "Authorization": "Bearer <access_token>",
  "Idempotency-Key": "req_01J..."
}
Request:
{
  "tenantId": "tenant_123",
  "actorId": "user_123",
  "payload": ${JSON.stringify(createPayload, null, 2).replace(/\n/g, "\n  ")}
}
Response 201:
{
  "${resourceIdField}": "${resourceIdValue}",
  "status": "active",
  "version": 1,
  "createdAt": "2026-06-21T10:00:00Z"
}

---

POST /v1/${problem.id}/${profile.primaryResourcePath}/{${resourceIdField}}/actions/${runtimeAction}
Headers:
{
  "Authorization": "Bearer <access_token>",
  "Idempotency-Key": "req_01K..."
}
Request:
{
  "tenantId": "tenant_123",
  "actorId": "user_123",
  "payload": ${JSON.stringify(runtimePayload, null, 2).replace(/\n/g, "\n  ")}
}
Response 200:
{
  "${resourceIdField}": "${resourceIdValue}",
  "status": "accepted",
  "result": {
    "decision": "allowed",
    "reason": "${toCamelIdentifier(runtimeOperation.label)}"
  },
  "version": 2
}

---

GET /v1/${problem.id}/${profile.primaryResourcePath}/{${resourceIdField}}
Query:
{
  "tenantId": "tenant_123",
  "include": "status,metadata"
}
Response 200:
{
  "${resourceIdField}": "${resourceIdValue}",
  "tenantId": "tenant_123",
  "status": "active",
  "version": 2,
  "data": ${JSON.stringify(createPayload, null, 2).replace(/\n/g, "\n  ")}
}`;
};

const urlShortenerApiSpecCode = `POST /v1/short-links
Headers:
{
  "Authorization": "Bearer <access_token>",
  "Idempotency-Key": "req_01J..."
}
Request:
{
  "longUrl": "https://example.com/articles/system-design?ref=interview",
  "customAlias": "summer-sale",
  "expiresAt": "2026-07-21T10:00:00Z"
}
Response 201:
{
  "shortLinkId": "sl_123",
  "slug": "summer-sale",
  "shortUrl": "https://sho.rt/summer-sale",
  "status": "active",
  "version": 1
}

---

GET /{slug}
Response 302:
Headers:
{
  "Location": "https://example.com/articles/system-design?ref=interview",
  "Cache-Control": "public, max-age=300"
}
Side effect:
{
  "eventType": "redirectServed",
  "shortLinkId": "sl_123",
  "slug": "summer-sale",
  "referrer": "https://search.example",
  "ipHash": "sha256:...",
  "occurredAt": "2026-06-21T10:00:00Z"
}

---

GET /v1/short-links/{shortLinkId}/analytics?from=&to=&groupBy=day
Response 200:
{
  "shortLinkId": "sl_123",
  "totalClicks": 18420,
  "uniqueVisitorsApprox": 12600,
  "buckets": [
    { "day": "2026-06-21", "clicks": 932 }
  ]
}`;

const buildApiSpecCode = (
  problem: ProblemContext,
  profile: SolutionProfile,
): string => {
  if (problem.id === "url-shortener") {
    return urlShortenerApiSpecCode;
  }

  return buildGenericApiSpecCode(problem, profile);
};

const buildEventSchemaCode = (
  problem: ProblemContext,
  profile: SolutionProfile,
): string => {
  const resourceIdField = `${toCamelIdentifier(profile.primaryResource)}Id`;
  const events = profile.operations
    .slice(0, 3)
    .map((operation) => {
      const subject = toKebabCase(
        requirementSubject(operation.label) || profile.primaryResource,
      );

      return `"${problem.id}.${subject}.${eventActionForOperation(
        operation.label,
      )}"`;
    })
    .join(" | ");

  return `type ${toPascalIdentifier(profile.primaryResource)}DomainEvent = {
  eventId: string;
  eventType: ${events};
  tenantId: string;
  actorId: string;
  ${resourceIdField}: string;
  idempotencyKey?: string;
  previousVersion: number;
  newVersion: number;
  occurredAt: ISODateTime;
  payload: Record<string, unknown>;
};`;
};

const buildDataFlowCode = (
  problem: ProblemContext,
  profile: SolutionProfile,
): string => `WRITE: ${lowerFirst(profile.primaryOperation.label)}
1. Client -> API gateway: ${operationRoute(problem, profile, profile.primaryOperation)}
2. API gateway -> ${profile.primaryResourceTitle} service: auth, quota, validation, idempotency lookup
3. ${profile.primaryResourceTitle} service -> primary store: compare version, write ${profile.primaryResource}, operation row, and outbox event in one transaction
4. Primary store -> event stream: relay outbox event after commit
5. Workers -> projections/providers: update caches, indexes, notifications, analytics, cleanup, or reconciliation
6. Client <- API gateway: committed, accepted, rejected, or pending state

READ: ${lowerFirst(profile.readOperation.label)}
1. Client -> API gateway: ${operationRoute(problem, profile, profile.readOperation)}
2. API gateway -> query service: authorize tenant/user scope
3. Query service -> cache/projection/index: read by stable key and bounded filters
4. Query service -> primary store: fallback on miss or correctness-sensitive read
5. Client <- query service: resource state with version, freshness, and pagination cursor`;

const buildArchitectureCode = (profile: SolutionProfile): string => `Clients
  -> ${profile.domainTitle} API gateway
      -> ${profile.primaryResourceTitle} service
          -> ${profile.architecture.stores[0] ?? "primary database"}
          -> outbox/event stream
              -> ${profile.architecture.background.join("\n              -> ")}
      -> ${profile.domainTitle} query service
          -> ${profile.architecture.stores[1] ?? "cache/projection store"}
          -> ${profile.architecture.stores[2] ?? "serving index/event stream"}

Ownership:
- API gateway: authentication, authorization, throttling, request validation.
- ${profile.primaryResourceTitle} service: source-of-truth state transitions.
- Query service: read models, cache lookup, pagination, freshness metadata.
- Workers: side effects, projection rebuilds, provider calls, analytics, repair.`;

const buildDeepDiveCode = (
  problem: ProblemContext,
  profile: SolutionProfile,
): string => `Capacity driver:
- Workload: ${stripTerminalPunctuation(problem.scale)}
- Hot write path: ${lowerFirst(profile.primaryOperation.label)}
- Hot read path: ${lowerFirst(profile.readOperation.label)}

Correctness boundary:
- Strong: source-of-truth ${profile.primaryResource}, idempotency record, ownership/permission checks, lifecycle version.
- Eventual: cache, projection, search/ranking index, analytics, notifications, dashboard views.

Failure policy:
- Retry with bounded exponential backoff and idempotency keys.
- Dead-letter after max attempts with replay metadata.
- Reconcile projections from the event log.
- Degrade optional reads/analytics before accepting corrupt writes.

Primary risks:
${profile.risks.map((risk) => `- ${sentenceCase(risk)}`).join("\n")}`;

const renderSampleSolution = (
  problem: ProblemContext,
  stageId: StageId,
  sections: string[],
): StageEditorialSeed => ({
  contentHtml: [
    renderParagraph(
      `This is the reference ${stageIntroLabels[stageId]} solution for ${problem.title}.`,
    ),
    renderParagraph(`Scale assumption: ${problem.scale}`),
    ...sections,
  ].join(""),
  problemId: problem.id,
  stageId,
  title: `Reference ${stageLabels[stageId]} Solution: ${problem.title}`,
});

const buildRequirementsEditorial = (
  problem: ProblemContext,
  requirementsRubric: StageRubric,
): StageEditorialSeed => {
  const profile = buildSolutionProfile(problem, requirementsRubric);

  return renderSampleSolution(problem, "requirements", [
    renderParagraph(
      `For v1, this solution supports the core ${profile.domain} flows first and leaves advanced variants out of scope.`,
    ),
    renderSection(
      "Functional scope",
      requirementsRubric.functional.map(checkToSolutionLine),
    ),
    renderSection(
      "Non-functional targets",
      importantChecks(requirementsRubric.nonFunctional, 6),
    ),
    renderSection("Explicit deferrals", [
      ...profile.variants.map(deferredVariant),
      "Advanced admin tooling, offline backfills, and broad analytics stay out of the first version unless they are central to the prompt.",
    ]),
    renderSection("Acceptance criteria", [
      `The first version works at ${stripTerminalPunctuation(
        problem.scale,
      )} without relying on a single hot database row, unbounded scans, or best-effort correctness.`,
      `This solution handles ${profile.risks.join(", ")} before moving into architecture.`,
      "Correctness boundaries are explicit: strong consistency for source-of-truth mutations, eventual consistency for derived projections and analytics.",
    ]),
  ]);
};

const buildCoreEntitiesEditorial = (
  problem: ProblemContext,
  requirementsRubric: StageRubric,
): StageEditorialSeed => {
  const profile = buildSolutionProfile(problem, requirementsRubric);
  const operationSubjects = limit(
    profile.operations.map((operation) => requirementSubject(operation.label)),
    5,
  );
  const coreEntities =
    problem.id === "url-shortener"
      ? [
          "ShortLink: source-of-truth row for longUrl, slug/customAlias, status, expiry, owner, and version.",
          "SlugReservation: uniqueness guard for generated or custom slugs; written transactionally before ShortLink activation.",
          "RedirectEvent: append-only click event emitted on each redirect for delayed analytics aggregation.",
          "BlockedUrl/AbuseReview: records malicious URL decisions and prevents unsafe redirects before activation.",
          "ClickAggregate: rollup by shortLinkId, day, country, referrer, or device class for analytics reads.",
        ]
      : [
          `Tenant/User/Actor: id, plan or quota tier, permissions, preferences, region, status, createdAt, and updatedAt.`,
          `${profile.primaryResourceTitle}: id, ownerId, tenantId, status, version, createdAt, updatedAt, expiresAt when needed, and domain fields for ${operationSubjects
            .slice(0, 3)
            .join(", ")}.`,
          `${profile.primaryResourceTitle}Operation: requestId, idempotencyKey, actorId, target ${profile.primaryResource} id, operation type, payload hash, status, retry count, and error code.`,
          `${profile.primaryResourceTitle}Relationship: captures membership, ownership, routing, visibility, assignment, subscription, or graph edges with cardinality and effective dates.`,
          `${profile.primaryResourceTitle}Event: append-only eventId, resourceId, actorId, event type, previousVersion, newVersion, occurredAt, and replay metadata.`,
        ];
  const indexes =
    problem.id === "url-shortener"
      ? [
          "Unique index on slug for redirect lookup and collision prevention.",
          "Owner index on ownerId, createdAt for listing a user's links.",
          "TTL/lifecycle index on expiresAt and status for expiry cleanup.",
          "Append-only redirect event partition by shortLinkId or day for analytics aggregation.",
          "Hot-link cache key by slug with short TTL and single-flight refresh on cache miss.",
        ]
      : [
          `Primary lookup: ${profile.primaryResource} by id or external key for ${profile.readOperation.label}.`,
          `Owner-scoped list: tenantId/ownerId plus status or createdAt for paginated reads of ${profile.primaryResourcePlural}.`,
          "Idempotency lookup: tenantId plus idempotencyKey to dedupe retried writes.",
          "Event replay lookup: resourceId plus version or occurredAt for rebuilding read models and debugging.",
          "TTL or lifecycle index: expiresAt/status for cleanup, revocation, archival, or delayed workflows.",
        ];
  const modelingDecisions =
    problem.id === "url-shortener"
      ? [
          "Slug creation is strongly consistent: reserve slug, create ShortLink, and commit both in one transaction.",
          "Redirects are read-heavy and cacheable; cache slug -> longUrl/status/expiresAt at edge or regional cache.",
          "Click analytics are asynchronous; redirect latency does not wait for analytics writes.",
          "Expired, disabled, or blocked links return a stable error page instead of redirecting.",
          "Hot links are isolated with cache replication, request coalescing, and per-slug rate/abuse controls.",
        ]
      : [
          `The source of truth is normalized enough to protect ${profile.primaryResourcePlural}, while hot reads use denormalized projections keyed by tenant/user/resource.`,
          `Partition the hottest table by ${profile.focus.join(", ")} or by tenant/resource/time, because the stated scale is ${stripTerminalPunctuation(problem.scale)}.`,
          `Large payloads, media, model artifacts, exports, or logs go to object storage; transactional tables keep metadata and references.`,
          `The model prevents ${profile.risks.join(", ")} through uniqueness constraints, version checks, status transitions, TTLs, and audit events.`,
        ];

  return renderSampleSolution(problem, "core-entities", [
    renderParagraph(
      `The data model centers on ${profile.primaryResourcePlural}, with explicit ownership, lifecycle state, and event history.`,
    ),
    renderCodeBlock(buildEntitySchemaCode(problem, profile)),
    renderSection("Core entities", coreEntities),
    renderSection("Indexes and access patterns", indexes),
    renderSection("Modeling decisions", modelingDecisions),
  ]);
};

const buildApiEditorial = (
  problem: ProblemContext,
  requirementsRubric: StageRubric,
): StageEditorialSeed => {
  const profile = buildSolutionProfile(problem, requirementsRubric);
  const runtimeOperation = getRuntimeOperation(profile);
  const runtimeAction = toKebabCase(
    requirementSubject(runtimeOperation.label) || "execute",
  );
  const apiContractSummaries =
    problem.id === "url-shortener"
      ? [
          "POST /v1/short-links: create a short link from a long URL with optional custom alias and expiry.",
          "GET /{slug}: resolve the slug and return a 302 redirect with cache headers.",
          "GET /v1/short-links/{shortLinkId}/analytics?from=&to=&groupBy=day: return aggregated click analytics.",
        ]
      : [
          `POST /v1/${problem.id}/${profile.primaryResourcePath}: create or configure ${profile.primaryResourcePlural}.`,
          `POST /v1/${problem.id}/${profile.primaryResourcePath}/{${toCamelIdentifier(
            profile.primaryResource,
          )}Id}/actions/${runtimeAction}: execute ${lowerFirst(runtimeOperation.label)}.`,
          `GET /v1/${problem.id}/${profile.primaryResourcePath}/{${toCamelIdentifier(
            profile.primaryResource,
          )}Id}: read current state, metadata, and version.`,
          `GET /v1/${problem.id}/${profile.primaryResourcePath}?cursor=&limit=&status=&ownerId=: paginated list endpoint for operational views and user history.`,
        ];

  return renderSampleSolution(problem, "api-interface", [
    renderParagraph(
      `The public contract exposes ${profile.domain} operations directly instead of generic CRUD. Mutations are retry-safe and reads are bounded.`,
    ),
    renderCodeBlock(buildApiSpecCode(problem, profile)),
    renderSection("External API contract", apiContractSummaries),
    renderSection("Request and response shape", [
      "Requests include actorId or authenticated subject, tenantId, idempotencyKey for mutations, domain payload, client request timestamp, and optional conditional version.",
      "Responses include resource id, status, version, createdAt/updatedAt, user-visible state, and links to status or retry endpoints when work is asynchronous.",
      "Errors distinguish validation, unauthorized, forbidden, not found, conflict/version mismatch, rate limited, dependency timeout, and retryable internal failure.",
      "High-volume reads use cursor pagination, stable sorting, bounded filters, and freshness metadata.",
    ]),
    renderSection("Internal events", [
      ...profile.operations
        .slice(0, 3)
        .map((operation) => eventContract(problem, profile, operation)),
      "Consumers must be idempotent and use the event ID/resource version as the dedupe key.",
    ]),
    renderCodeBlock(buildEventSchemaCode(problem, profile)),
    renderSection("Contract guarantees", [
      "Authentication, authorization, quota checks, validation, and idempotency happen before committing a mutation.",
      "Slow fan-out, provider calls, indexing, ranking, notifications, or analytics return accepted/status and complete asynchronously.",
      `The contract handles ${profile.risks.join(", ")} without exposing storage topology to clients.`,
    ]),
  ]);
};

const buildDataFlowEditorial = (
  problem: ProblemContext,
  requirementsRubric: StageRubric,
): StageEditorialSeed => {
  const profile = buildSolutionProfile(problem, requirementsRubric);

  return renderSampleSolution(problem, "data-flow", [
    renderParagraph(
      `The main flow is ${lowerFirst(profile.primaryOperation.label)} with a separate read path for ${lowerFirst(profile.readOperation.label)}.`,
    ),
    renderCodeBlock(buildDataFlowCode(problem, profile)),
    renderSection("Write path", [
      `Client sends ${lowerFirst(profile.primaryOperation.label)} to the gateway; auth, quota, validation, abuse checks, and idempotency are enforced before work enters the domain service.`,
      `${profile.primaryResourceTitle} service loads current policy/state, validates the command, and writes the source-of-truth ${profile.primaryResource} record plus operation record in one transaction.`,
      "The transaction includes an outbox event so the durable state and emitted event cannot diverge.",
      `The user receives committed, pending, or rejected state; non-critical work is not allowed to hold the user-facing response hostage.`,
      `${profile.architecture.background.join(", ")} consume the event for projections, notifications, indexing, analytics, provider calls, cleanup, or reconciliation.`,
    ]),
    renderSection("Read path", [
      `Gateway routes ${lowerFirst(profile.readOperation.label)} to a serving/query service optimized for ${profile.focus.join(", ")}.`,
      "The serving path checks an edge cache, in-memory cache, search index, or materialized projection before falling back to the source store.",
      "Cache keys include tenant/user/partition context so one hot customer or resource cannot poison the entire fleet.",
      "Responses include version, freshness, pending state, or lastUpdatedAt so clients understand eventual consistency.",
      "Unbounded reads are paginated with stable sort keys and capped filters.",
    ]),
    renderSection("Async and retry behavior", [
      "Workers claim work with leases, consumer offsets, or visibility timeouts so failed work can be retried without losing ownership.",
      "Retries use exponential backoff, bounded attempts, and dead-letter queues with replay metadata.",
      "Every side effect uses requestId, eventId, idempotencyKey, or resource version as the dedupe key.",
      "Back-pressure slows producers, sheds optional work, or degrades freshness before corrupting source-of-truth state.",
    ]),
    renderSection("Failure behavior", [
      `For ${profile.risks.join(", ")}, the flow uses rate limits, circuit breakers, dedupe, hot-key isolation, reconciliation, and explicit user-visible pending/failed states.`,
      "If a cache or index is down, critical reads fall back to source data where possible and optional freshness degrades.",
      "If the queue or provider is down, committed mutations remain durable and background work resumes from the outbox or event log.",
      "Operators monitor p95/p99 latency, queue lag, retry rate, dead letters, cache hit rate, and domain correctness drift.",
    ]),
  ]);
};

const buildHighLevelDesignEditorial = (
  problem: ProblemContext,
  requirementsRubric: StageRubric,
): StageEditorialSeed => {
  const profile = buildSolutionProfile(problem, requirementsRubric);

  return renderSampleSolution(problem, "high-level-design", [
    renderParagraph(
      `The design has a small source-of-truth core, separate serving projections for hot reads, and asynchronous workers for slow side effects.`,
    ),
    renderCodeBlock(buildArchitectureCode(profile)),
    renderSection("Components", [
      `${profile.domainTitle} API gateway: terminates auth, rate limits, request validation, routing, and idempotency checks.`,
      `${profile.primaryResourceTitle} service: owns ${profile.primaryResourcePlural}, lifecycle transitions, source-of-truth writes, and synchronous correctness.`,
      `${profile.domainTitle} query service: serves hot reads from cache, projections, indexes, or search structures without overloading the write store.`,
      ...profile.focus
        .slice(0, 3)
        .map(
          (focusArea) =>
            `${toTitleCase(focusArea)} component: owns the domain-specific behavior needed for ${focusArea}.`,
        ),
      `${profile.architecture.background[0] ?? "worker fleet"}: processes committed events for async side effects, projections, cleanup, and reconciliation.`,
      "Operations/control plane: owns policy changes, admin overrides, audit views, rollout safety, and manual repair tools.",
    ]),
    renderSection("Stores and messaging", [
      `${profile.architecture.stores[0] ?? "primary database"}: source of truth for ${profile.primaryResourcePlural}, operation records, ownership, and lifecycle state.`,
      `${profile.architecture.stores[1] ?? "cache"}: read-optimized store for hot ${profile.domain} lookups and derived projections.`,
      `${profile.architecture.stores[2] ?? "event stream"}: durable outbox/event stream connecting committed writes to workers.`,
      "Idempotency/dedupe store: protects mutating APIs and async consumers from duplicate work.",
      "Audit/observability store: records security-sensitive changes, operational metrics, traces, and dead-letter inspection data.",
    ]),
    renderSection("Architecture flow", [
      `Mutations for ${profile.primaryOperation.label} go gateway -> ${profile.primaryResourceTitle} service -> source database plus outbox -> event stream -> workers.`,
      `Reads for ${profile.readOperation.label} go gateway -> query service -> cache/projection/index -> source fallback on miss.`,
      "Only the domain service changes source-of-truth state; workers update derived state and external side effects.",
      "The system keeps correctness in transactional records and accepts eventual consistency for search, feeds, analytics, notifications, and dashboards.",
      "Observability, audit, and runbooks are part of the design, not post-interview add-ons.",
    ]),
    renderSection("Scaling and reliability", [
      `Partition source tables and streams by tenant, user, resource, or time depending on the hot path at ${problem.scale}.`,
      `Mitigate ${profile.risks.join(", ")} with sharding, caching, batching, hot-key isolation, back-pressure, and replayable events.`,
      "Replicate source-of-truth data, define failover behavior, and keep derived projections rebuildable from the event log.",
      "Do not put API serving, source-of-truth writes, fan-out, indexing, analytics, and admin workflows into one unbounded service.",
    ]),
    renderSection("Tradeoffs", [
      `The chosen design optimizes for ${profile.focus.join(", ")} while keeping optional variants deferred.`,
      "Global coordination is used only for uniqueness, money/security-sensitive state, or strict lifecycle transitions.",
      "Everything else is handled with projections, caches, async workers, and reconciliation to keep the system operable at scale.",
    ]),
  ]);
};

const buildDeepDivesEditorial = (
  problem: ProblemContext,
  requirementsRubric: StageRubric,
  stageRubric: StageRubric,
): StageEditorialSeed => {
  const profile = buildSolutionProfile(problem, requirementsRubric);

  return renderSampleSolution(problem, "deep-dives", [
    renderParagraph(
      `The deep dive focuses on the first bottleneck or correctness risk likely to break ${profile.domain} at the stated scale.`,
    ),
    renderCodeBlock(buildDeepDiveCode(problem, profile)),
    renderSection("Bottlenecks and mitigations", [
      ...profile.risks.map(
        (risk) =>
          `${sentenceCase(risk)}: isolate the trigger, protect the hot partition or dependency, add bounded queues/rate limits, and expose user-visible degraded or pending state.`,
      ),
      `Capacity is derived from ${problem.scale}; the first saturation point is named for the write path, read path, storage/index, or worker queue.`,
      "Hot reads use cache/projection/index isolation, request coalescing, and TTLs; hot writes use partitioning, batching, admission control, and async processing.",
    ]),
    renderSection("Correctness tradeoffs", [
      `Strong consistency protects ${profile.primaryResourcePlural}, ownership, permissions, lifecycle transitions, and idempotency records.`,
      "Eventual consistency is acceptable for caches, projections, analytics, notifications, ranking, search, and dashboards when freshness is shown or bounded.",
      "Concurrent writes use versions, compare-and-swap, unique constraints, leases, or per-resource serialization.",
      "Duplicate, delayed, reordered, or missing events are detected with event IDs, resource versions, consumer offsets, replay, and reconciliation jobs.",
    ]),
    renderSection("Failure and recovery", [
      "Dependency timeouts use bounded retries, circuit breakers, fallbacks, and explicit partial-failure responses.",
      "Queue overload triggers back-pressure, priority lanes, load shedding, delayed processing, or feature degradation before source data is corrupted.",
      "Recovery uses outbox replay, backfills, dead-letter inspection, reconciliation reports, and data repair tools.",
      "Regional failure specifies active-active, active-passive, or reduced-function failover, plus the consistency impact during recovery.",
    ]),
    renderSection("Observability", [
      "Track p95/p99 latency, error rate, saturation, queue lag, retry rate, dead-letter count, cache hit rate, provider failure rate, and failover state.",
      `Track domain correctness metrics for ${profile.domain}, especially duplicate operations, stale projections, dropped events, invalid state transitions, or reconciliation drift.`,
      "Alerts page on user-impacting symptoms and keep low-priority analytics lag or backfill delay at ticket severity.",
    ]),
    renderSection("Evolution path", [
      ...profile.variants.map(
        (variant) =>
          `${variant}: add a component, schema field, projection, or worker path without breaking the v1 API contract.`,
      ),
      "At 10x traffic, split the hottest service/store boundary first, then add specialized indexes, regionalization, or async precomputation.",
      "The migration path should preserve API compatibility and replay historical events or backfill projections where needed.",
    ]),
    renderSection(
      "Rubric coverage",
      importantChecks(
        [...stageRubric.functional, ...stageRubric.nonFunctional],
        6,
      ),
    ),
  ]);
};

const buildStageEditorial = (
  problem: ProblemContext,
  stageId: StageId,
): StageEditorialSeed => {
  const requirementsRubric = getRubric(problem, "requirements");
  const stageRubric =
    stageId === "requirements"
      ? requirementsRubric
      : getRubric(problem, stageId);

  if (stageId === "requirements") {
    return buildRequirementsEditorial(problem, requirementsRubric);
  }

  if (stageId === "core-entities") {
    return buildCoreEntitiesEditorial(problem, requirementsRubric);
  }

  if (stageId === "api-interface") {
    return buildApiEditorial(problem, requirementsRubric);
  }

  if (stageId === "data-flow") {
    return buildDataFlowEditorial(problem, requirementsRubric);
  }

  if (stageId === "high-level-design") {
    return buildHighLevelDesignEditorial(problem, requirementsRubric);
  }

  return buildDeepDivesEditorial(problem, requirementsRubric, stageRubric);
};

export const buildStageEditorialSeeds = (
  problems: ProblemContext[],
): StageEditorialSeed[] =>
  problems.flatMap((problem) =>
    stageIds.map((stageId) => buildStageEditorial(problem, stageId)),
  );

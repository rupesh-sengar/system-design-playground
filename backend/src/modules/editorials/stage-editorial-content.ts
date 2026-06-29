import { stageIds, type ProblemContext, type StageId } from "../ai/contracts.js";
import { getCuratedStageRubric } from "../judge/rubrics/curated-stage.registry.js";
import type { RequirementCheck, StageRubric } from "../judge/types.js";
import type {
  SystemDesignConnectorKind,
  SystemDesignDiagram,
  SystemDesignDiagramConnector,
  SystemDesignDiagramNode,
  SystemDesignNodeKind,
} from "../../shared/system-design-diagram.js";

export interface StageEditorialSeed {
  contentHtml: string;
  diagramJson?: SystemDesignDiagram | null;
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
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
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

type CoreEntityModel = {
  coreEntities: string[];
  indexes: string[];
  modelingDecisions: string[];
  schemaCode: string;
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

const slackEntitySchemaCode = `type ISODateTime = string;

type Workspace = {
  workspaceId: string;
  enterpriseId?: string;
  name: string;
  plan: "free" | "pro" | "enterprise";
  region: string;
  retentionPolicyId: string;
  createdAt: ISODateTime;
};

type User = {
  userId: string;
  email: string;
  displayName: string;
  status: "active" | "deactivated";
};

type WorkspaceMember = {
  workspaceId: string;
  userId: string;
  role: "owner" | "admin" | "member" | "guest";
  joinedAt: ISODateTime;
};

type Channel = {
  channelId: string;
  workspaceId: string;
  name: string;
  visibility: "public" | "private" | "shared";
  createdByUserId: string;
  createdAt: ISODateTime;
  archivedAt?: ISODateTime;
};

type ChannelMembership = {
  channelId: string;
  workspaceId: string;
  userId: string;
  role: "member" | "moderator";
  lastReadMessageId?: string;
  notificationPreference: "all" | "mentions" | "muted";
};

type Message = {
  messageId: string;
  workspaceId: string;
  channelId: string;
  senderUserId: string;
  parentMessageId?: string;
  threadId?: string;
  body: string;
  version: number;
  createdAt: ISODateTime;
  editedAt?: ISODateTime;
  deletedAt?: ISODateTime;
};

type Thread = {
  threadId: string;
  workspaceId: string;
  channelId: string;
  rootMessageId: string;
  replyCount: number;
  lastReplyAt: ISODateTime;
};

type Reaction = {
  messageId: string;
  workspaceId: string;
  userId: string;
  emoji: string;
  createdAt: ISODateTime;
};

type SearchDocument = {
  documentId: string;
  workspaceId: string;
  channelId: string;
  messageId: string;
  visibilityAclVersion: number;
  indexedAt: ISODateTime;
};

type IntegrationInstallation = {
  installationId: string;
  workspaceId: string;
  appId: string;
  installedByUserId: string;
  scopes: string[];
  status: "active" | "revoked";
};`;

const urlShortenerCoreEntityModel: CoreEntityModel = {
  coreEntities: [
    "ShortLink: source-of-truth row for longUrl, slug/customAlias, status, expiry, owner, and version.",
    "SlugReservation: uniqueness guard for generated or custom slugs; written transactionally before ShortLink activation.",
    "RedirectEvent: append-only click event emitted on each redirect for delayed analytics aggregation.",
    "BlockedUrl/AbuseReview: records malicious URL decisions and prevents unsafe redirects before activation.",
    "ClickAggregate: rollup by shortLinkId, day, country, referrer, or device class for analytics reads.",
    "Relationships and cardinality: one owner has many ShortLinks, one ShortLink has one active SlugReservation, one ShortLink has many RedirectEvents, and ClickAggregate maps many events into one materialized projection bucket.",
  ],
  indexes: [
    "Unique index on slug for redirect lookup and collision prevention.",
    "Owner index on ownerId, createdAt for listing a user's links.",
    "TTL/lifecycle index on expiresAt and status for expiry cleanup.",
    "Append-only redirect event partition by shortLinkId or day for analytics aggregation.",
    "Hot-link cache key by slug with short TTL and single-flight refresh on cache miss.",
  ],
  modelingDecisions: [
    "Slug creation is strongly consistent: reserve slug, create ShortLink, and commit both in one transaction.",
    "Redirects are read-heavy and cacheable; cache slug -> longUrl/status/expiresAt at edge or regional cache.",
    "Click analytics are asynchronous; redirect latency does not wait for analytics writes.",
    "Expired, disabled, or blocked links return a stable error page instead of redirecting.",
    "Hot links are isolated with cache replication, request coalescing, and per-slug rate/abuse controls.",
    "Normalize ShortLink and SlugReservation to protect uniqueness; denormalize redirect analytics into ClickAggregate materialized projections for hot reads.",
    "Scope tradeoff: advanced billing, custom-domain management, and broad analytics exports stay out of scope for the initial version.",
  ],
  schemaCode: urlShortenerEntitySchemaCode,
};

const coreEntityNamesByProblemId: Record<string, string[]> = {
  "ad-click-counter": [
    "AdCampaign",
    "ClickEvent",
    "DeduplicationKey",
    "AttributionWindow",
    "ClickAggregate",
    "LateEvent",
  ],
  "analytics-pipeline": [
    "EventSchema",
    "RawEvent",
    "StreamPartition",
    "ProcessingJob",
    "WarehouseTable",
    "DeduplicationKey",
  ],
  "api-gateway": [
    "Route",
    "UpstreamService",
    "Consumer",
    "AuthPolicy",
    "RateLimitPolicy",
    "RequestLog",
  ],
  "audit-log": [
    "AuditEvent",
    "Actor",
    "Resource",
    "TamperProofSegment",
    "RetentionPolicy",
    "ExportJob",
  ],
  autocomplete: [
    "SearchTerm",
    "PrefixIndexEntry",
    "Suggestion",
    "RankingSignal",
    "TrendWindow",
    "LocaleDictionary",
  ],
  "calendar-scheduler": [
    "Calendar",
    "CalendarEvent",
    "RecurrenceRule",
    "Attendee",
    "AvailabilitySlot",
    "Invitation",
    "Reminder",
  ],
  cdn: [
    "CacheObject",
    "Origin",
    "EdgeLocation",
    "RoutingRule",
    "PurgeRequest",
    "CachePolicy",
  ],
  "checkout-service": [
    "Cart",
    "Order",
    "PricingSnapshot",
    "InventoryReservation",
    "PaymentAttempt",
    "CheckoutSession",
  ],
  "cloud-drive": [
    "File",
    "Folder",
    "FileVersion",
    "Chunk",
    "SharePermission",
    "SyncCursor",
  ],
  "collaborative-docs": [
    "Document",
    "DocumentVersion",
    "Operation",
    "CursorPresence",
    "Comment",
    "Permission",
  ],
  "collaborative-whiteboard": [
    "Board",
    "CanvasObject",
    "Delta",
    "ViewportPresence",
    "BoardSnapshot",
    "Permission",
  ],
  "config-service": [
    "ConfigKey",
    "ConfigVersion",
    "Environment",
    "ValidationRule",
    "Rollout",
    "Rollback",
  ],
  "digital-wallet": [
    "Wallet",
    "Account",
    "LedgerEntry",
    "BalanceSnapshot",
    "Transfer",
    "ReconciliationRun",
  ],
  "distributed-cache": [
    "CacheKey",
    "CacheEntry",
    "Shard",
    "Replica",
    "EvictionPolicy",
    "InvalidationEvent",
  ],
  "email-service": [
    "Mailbox",
    "Message",
    "ConversationThread",
    "Folder",
    "Attachment",
    "SpamVerdict",
    "SearchDocument",
  ],
  "facebook-news-feed": [
    "User",
    "Post",
    "FriendEdge",
    "FeedItem",
    "RankingFeature",
    "AdCandidate",
  ],
  "feature-flags": [
    "FeatureFlag",
    "Environment",
    "FlagVariant",
    "TargetingRule",
    "Segment",
    "EvaluationEvent",
    "ChangeSet",
  ],
  "file-storage": [
    "File",
    "Chunk",
    "Replica",
    "PlacementRecord",
    "RepairJob",
    "NamespaceEntry",
  ],
  "food-delivery": [
    "Order",
    "Restaurant",
    "Courier",
    "DispatchAssignment",
    "DeliveryRoute",
    "EtaSnapshot",
  ],
  "fraud-detection": [
    "Transaction",
    "FeatureVector",
    "RiskScore",
    "FraudRule",
    "Case",
    "FeedbackLabel",
  ],
  "geofence-alerts": [
    "Geofence",
    "DeviceLocation",
    "GeofenceEvent",
    "AlertSubscription",
    "DeduplicationWindow",
    "Notification",
  ],
  "identity-sso": [
    "Tenant",
    "IdentityProvider",
    "User",
    "FederatedIdentity",
    "Session",
    "Token",
    "Policy",
  ],
  "image-hosting": [
    "Image",
    "ImageVariant",
    "Album",
    "MetadataRecord",
    "ResizeJob",
    "CdnInvalidation",
  ],
  "instagram-feed": [
    "User",
    "MediaPost",
    "FollowEdge",
    "FeedItem",
    "RankingSignal",
    "MediaAsset",
  ],
  "inventory-management": [
    "Sku",
    "Warehouse",
    "InventoryLedger",
    "Reservation",
    "StockLevel",
    "ReconciliationRun",
  ],
  jira: [
    "Project",
    "Issue",
    "Workflow",
    "StatusTransition",
    "Board",
    "Sprint",
    "PermissionScheme",
  ],
  "job-scheduler": [
    "JobDefinition",
    "Schedule",
    "Trigger",
    "Execution",
    "Lease",
    "RetryPolicy",
  ],
  "kanban-board": [
    "Board",
    "Column",
    "Card",
    "CardOrder",
    "ActivityEvent",
    "Permission",
  ],
  "linkedin-feed": [
    "Member",
    "Post",
    "ConnectionEdge",
    "FeedItem",
    "CompanyPage",
    "RankingFeature",
  ],
  "live-streaming": [
    "Stream",
    "Broadcaster",
    "IngestSession",
    "ChatMessage",
    "ViewerSession",
    "Recording",
  ],
  "log-aggregation": [
    "LogEvent",
    "LogStream",
    "IngestionBatch",
    "IndexSegment",
    "RetentionPolicy",
    "QueryJob",
  ],
  "metrics-dashboard": [
    "MetricSeries",
    "MetricSample",
    "LabelSet",
    "Dashboard",
    "AlertRule",
    "DownsampledRollup",
  ],
  "model-serving": [
    "Model",
    "ModelVersion",
    "Endpoint",
    "Deployment",
    "TrafficSplit",
    "PredictionLog",
  ],
  netflix: [
    "Title",
    "VideoAsset",
    "PlaybackSession",
    "Profile",
    "ViewingProgress",
    "CdnManifest",
  ],
  "notification-service": [
    "Notification",
    "Template",
    "RecipientPreference",
    "DeliveryAttempt",
    "ProviderEndpoint",
    "SuppressionRule",
  ],
  "object-storage": [
    "Bucket",
    "Object",
    "ObjectVersion",
    "MultipartUpload",
    "ReplicationRule",
    "LifecyclePolicy",
  ],
  "order-tracking": [
    "Order",
    "Shipment",
    "TrackingEvent",
    "CarrierWebhook",
    "TimelineEntry",
    "NotificationSubscription",
  ],
  pastebin: [
    "Paste",
    "PasteVersion",
    "Slug",
    "VisibilityPolicy",
    "ExpirationPolicy",
    "AbuseReview",
  ],
  "payment-gateway": [
    "Merchant",
    "PaymentIntent",
    "PaymentMethod",
    "Charge",
    "LedgerEntry",
    "Refund",
    "WebhookDelivery",
    "IdempotencyRecord",
  ],
  "presence-service": [
    "UserPresence",
    "DeviceSession",
    "Heartbeat",
    "PresenceSubscription",
    "VisibilityRule",
    "FanoutCursor",
  ],
  "promotion-engine": [
    "Promotion",
    "Coupon",
    "EligibilityRule",
    "Redemption",
    "PriorityPolicy",
    "AbuseSignal",
  ],
  "pub-sub": [
    "Topic",
    "Partition",
    "Producer",
    "ConsumerGroup",
    "ConsumerOffset",
    "Message",
  ],
  "push-fanout": [
    "PushMessage",
    "DeviceToken",
    "ProviderBatch",
    "DeliveryAttempt",
    "RetrySchedule",
    "DeliveryReceipt",
  ],
  "rate-limiter": [
    "RateLimitPolicy",
    "LimitKey",
    "CounterWindow",
    "TokenBucket",
    "QuotaDecision",
    "OverrideRule",
  ],
  recommendations: [
    "UserProfile",
    "Item",
    "CandidateSet",
    "RankingFeature",
    "Recommendation",
    "FeedbackEvent",
  ],
  reddit: [
    "Community",
    "Post",
    "Comment",
    "Vote",
    "ModerationAction",
    "RankingScore",
  ],
  "ride-sharing": [
    "Rider",
    "Driver",
    "Trip",
    "LocationUpdate",
    "MatchOffer",
    "Payment",
  ],
  "route-planner": [
    "MapSegment",
    "RouteRequest",
    "RoutePlan",
    "TrafficObservation",
    "MapVersion",
    "Waypoint",
  ],
  "search-engine": [
    "Document",
    "CrawlRecord",
    "IndexShard",
    "PostingList",
    "RankingSignal",
    "QueryLog",
  ],
  "service-discovery": [
    "Service",
    "ServiceInstance",
    "HealthCheck",
    "Registration",
    "WatchSubscription",
    "EndpointSnapshot",
  ],
  "session-store": [
    "Session",
    "SessionToken",
    "Device",
    "RevocationRecord",
    "RefreshToken",
    "RegionReplica",
  ],
  spotify: [
    "Track",
    "Album",
    "Playlist",
    "PlaybackSession",
    "AudioChunk",
    "RecommendationSignal",
  ],
  "stories-service": [
    "Story",
    "MediaAsset",
    "ViewerEdge",
    "PrivacyRule",
    "RankingSignal",
    "ExpirationPolicy",
  ],
  "support-ticketing": [
    "Ticket",
    "Conversation",
    "Customer",
    "Agent",
    "RoutingRule",
    "SlaPolicy",
    "Message",
  ],
  "task-queue": [
    "Task",
    "Queue",
    "Lease",
    "RetryPolicy",
    "DeadLetterEntry",
    "Worker",
  ],
  "time-series-database": [
    "MetricSeries",
    "Sample",
    "Shard",
    "Block",
    "CompactionJob",
    "RetentionPolicy",
  ],
  "twitter-timeline": [
    "User",
    "Tweet",
    "FollowEdge",
    "TimelineEntry",
    "FanoutJob",
    "RankingSignal",
  ],
  "vector-search": [
    "VectorDocument",
    "Embedding",
    "IndexShard",
    "MetadataFilter",
    "SearchQuery",
    "ReindexJob",
  ],
  "video-conferencing": [
    "Meeting",
    "Participant",
    "MediaSession",
    "SfuNode",
    "Recording",
    "ChatMessage",
  ],
  "web-crawler": [
    "Url",
    "CrawlFrontier",
    "FetchAttempt",
    "RobotsPolicy",
    "ContentDocument",
    "DeduplicationFingerprint",
  ],
  whatsapp: [
    "User",
    "Device",
    "Conversation",
    "ConversationMember",
    "Message",
    "DeliveryReceipt",
    "EncryptionKeyBundle",
    "MediaAttachment",
  ],
  youtube: [
    "Video",
    "Channel",
    "Creator",
    "TranscodeJob",
    "PlaybackManifest",
    "Comment",
  ],
};

const slackCoreEntityModel: CoreEntityModel = {
  coreEntities: [
    "Workspace: tenant boundary for billing, region, retention policy, enterprise controls, and namespace isolation.",
    "User and WorkspaceMember: User is the global identity; WorkspaceMember maps a user into one workspace with role, guest state, and membership lifecycle.",
    "Channel and ChannelMembership: Channel belongs to a workspace; ChannelMembership maps many users to many channels and stores role, last-read cursor, and notification preference.",
    "Message: immutable message identity plus editable versioned body, sender, channel, workspace, timestamps, and delete/tombstone state.",
    "Thread: root message plus reply count and lastReplyAt; thread replies are Messages with parentMessageId/threadId, not a separate generic blob.",
    "Reaction: per-message per-user emoji reaction, separated from Message so high-churn reactions do not rewrite message rows.",
    "SearchDocument: denormalized, permission-filtered search projection keyed by workspaceId/channelId/messageId with ACL version and indexedAt.",
    "IntegrationInstallation/Bot: installed app identity, scopes, status, installer, and target workspace for workflow bots and webhooks.",
    "RetentionPolicy/AuditEvent: enterprise retention, legal hold, delete policy, and administrative audit trail.",
  ],
  indexes: [
    "Workspace lookup by workspaceId and enterpriseId; WorkspaceMember by workspaceId,userId for auth and role checks.",
    "Channel lookup by workspaceId,channelId and channel list by workspaceId,visibility,name.",
    "ChannelMembership index by channelId,userId for permission checks and by userId for sidebar/channel listing.",
    "Message primary access path by workspaceId,channelId,createdAt/messageId for history pagination and websocket replay.",
    "Thread index by workspaceId,threadId and parentMessageId for reply pagination and unread thread badges.",
    "SearchDocument full-text index partitioned by workspaceId with ACL filters from channel membership and retention policy.",
    "Presence/session state is ephemeral and keyed by userId/deviceId/socketId outside the durable message model.",
  ],
  modelingDecisions: [
    "Normalize Workspace, User, Channel, Membership, Message, Thread, Reaction, and IntegrationInstallation because they have different ownership, lifecycle, write rates, and access patterns.",
    "Denormalize unread counters, recent channel list, thread summaries, and SearchDocument projections for hot reads; rebuild them from Message and AuditEvent streams.",
    "Partition durable messages by workspaceId and channelId/time so one enterprise tenant or hot channel cannot overload the global message store.",
    "Keep message edits/deletes versioned with tombstones so search, retention, audit, and clients can converge safely.",
    "Permission checks always combine WorkspaceMember, ChannelMembership, retention policy, and integration scopes before returning history or search results.",
    "Large file attachments live in object storage; Message stores metadata, attachment ids, and preview state only.",
    "Scope tradeoff: shared channels, workflow bot execution, and legal hold workflows are modeled as extensions but not required for the first durable chat model.",
  ],
  schemaCode: slackEntitySchemaCode,
};

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

const splitEntitySubject = (value: string): string[] =>
  unique(
    value
      .replace(/\b(read|write|create|update|delete|serve|support|manage)\b/gi, " ")
      .split(/\s+(?:and|or)\s+|,|\/|&/gi)
      .map((entry) =>
        entry
          .replace(
            /\b(model|models|service|services|handling|support|management|semantics|controls|architecture)\b/gi,
            " ",
          )
          .trim(),
      )
      .filter((entry) => entry.length >= 3),
  );

const deriveCoreEntityNames = (
  problem: ProblemContext,
  profile: SolutionProfile,
  operationSubjects: string[],
): string[] => {
  const curatedEntityNames = coreEntityNamesByProblemId[problem.id];

  if (curatedEntityNames) {
    return curatedEntityNames;
  }

  const fromOperations = operationSubjects.flatMap(splitEntitySubject);
  const fromFocus = profile.focus
    .filter(
      (focusArea) =>
        !/\b(cache|caching|fan-out|latency|ranking|partition|shard|scale|architecture|pipeline)\b/i.test(
          focusArea,
        ),
    )
    .flatMap(splitEntitySubject);
  const fromSummary = splitEntitySubject(problem.summary);
  const candidates = unique([
    ...fromOperations,
    ...fromFocus,
    ...fromSummary,
    profile.primaryResource,
  ])
    .map((entityName) => toTitleCase(singularizePhrase(entityName)))
    .filter(
      (entityName) =>
        entityName.length >= 3 &&
        !/\b(Add|Handle|Support|Design|System|Low|High|Fast|Heavy|Rich|Core)\b/i.test(
          entityName,
        ),
    );

  return unique(candidates).slice(0, 6);
};

const buildGenericCoreEntitySchemaCode = (
  entityNames: string[],
  profile: SolutionProfile,
): string => {
  const domainTypes = entityNames
    .map((entityName) => {
      const typeName = toPascalIdentifier(entityName);
      const idField = `${toCamelIdentifier(entityName)}Id`;

      return `type ${typeName} = {
  ${idField}: string;
  tenantId: string;
  ownerId?: string;
  status: "pending" | "active" | "disabled" | "deleted";
  version: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};`;
    })
    .join("\n\n");

  return `type ISODateTime = string;

type Tenant = {
  tenantId: string;
  plan: string;
  region: string;
  status: "active" | "suspended";
};

type Actor = {
  actorId: string;
  tenantId: string;
  role: string;
  status: "active" | "disabled";
};

${domainTypes}

type ${toPascalIdentifier(profile.primaryResource)}Relationship = {
  relationshipId: string;
  tenantId: string;
  fromEntityType: string;
  fromEntityId: string;
  toEntityType: string;
  toEntityId: string;
  relationshipType: "owns" | "member_of" | "references" | "subscribes_to";
  cardinality: "one-to-one" | "one-to-many" | "many-to-many";
  createdAt: ISODateTime;
};

type ${toPascalIdentifier(profile.primaryResource)}Event = {
  eventId: string;
  tenantId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  eventType: string;
  previousVersion: number;
  newVersion: number;
  occurredAt: ISODateTime;
};`;
};

const buildGenericCoreEntityModel = (
  problem: ProblemContext,
  profile: SolutionProfile,
  operationSubjects: string[],
): CoreEntityModel => {
  const entityNames = deriveCoreEntityNames(problem, profile, operationSubjects);
  const [primaryEntity, secondaryEntity, tertiaryEntity] = entityNames;
  const primaryName = primaryEntity ?? profile.primaryResourceTitle;
  const secondaryName = secondaryEntity ?? `${profile.domainTitle} Projection`;
  const tertiaryName = tertiaryEntity ?? `${profile.domainTitle} Event`;

  return {
    coreEntities: [
      "Tenant/Actor: tenantId, actorId, role, plan/quota tier, permissions, region, status, createdAt, and updatedAt.",
      ...entityNames.map(
        (entityName) =>
          `${entityName}: domain entity with its own id, tenantId, owner or parent id, status, version, lifecycle timestamps, and domain-specific fields for ${profile.focus.slice(0, 3).join(", ")}.`,
      ),
      `${primaryName}Relationship: explicit relationship/mapping table for ownership, membership, routing, visibility, subscriptions, assignments, or graph edges with cardinality and effective dates.`,
      `${primaryName}Event: append-only event history for mutations, replay, debugging, projections, search indexing, analytics, and audit trails.`,
      `${secondaryName}Projection: denormalized/materialized read model for the hottest query path so reads do not overload source-of-truth entities.`,
    ],
    indexes: [
      `Primary lookup: ${primaryName} by tenantId plus stable resource identifier or external key.`,
      `Relationship lookup: tenantId plus fromEntityId/toEntityId for ${primaryName} to ${secondaryName} joins and membership checks.`,
      `Owner-scoped list: tenantId/ownerId plus status, createdAt, or updatedAt for paginated reads.`,
      "Idempotency lookup: tenantId plus idempotencyKey to dedupe retried writes.",
      `Event replay lookup: tenantId plus entityId/version or occurredAt for rebuilding ${tertiaryName} projections and debugging.`,
      "Lifecycle/retention index: status, expiresAt, deletedAt, or archivedAt for cleanup, retention, and audit workflows.",
    ],
    modelingDecisions: [
      `Normalize ${entityNames.slice(0, 4).join(", ")} because they have distinct ownership, lifecycle, access patterns, and write rates.`,
      `Denormalize ${secondaryName}Projection, counters, search documents, feed/list views, or dashboard rows for hot reads and rebuild them from append-only events.`,
      `Partition the hottest source table by tenantId plus resource/time because the stated scale is ${stripTerminalPunctuation(problem.scale)}.`,
      `Large payloads, media, exports, model artifacts, or logs go to object storage; transactional rows keep metadata, references, status, and version.`,
      `The model addresses ${profile.risks.join(", ")} with uniqueness constraints, version checks, relationship cardinality, audit events, and lifecycle policies.`,
      `Scope tradeoff: ${profile.variants.join(", ")} stay as extension entities or projections unless the interview explicitly asks for them in v1.`,
    ],
    schemaCode: buildGenericCoreEntitySchemaCode(entityNames, profile),
  };
};

const buildCoreEntityModel = (
  problem: ProblemContext,
  profile: SolutionProfile,
  operationSubjects: string[],
): CoreEntityModel => {
  if (problem.id === "url-shortener") {
    return urlShortenerCoreEntityModel;
  }

  if (problem.id === "slack") {
    return slackCoreEntityModel;
  }

  return buildGenericCoreEntityModel(problem, profile, operationSubjects);
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
  "X-Tenant-Id": "tenant_123",
  "Idempotency-Key": "req_01J..."
}
Request body schema:
{
  "tenantId": "tenant_123",
  "actorId": "user_123",
  "clientRequestId": "client_req_123",
  "payload": ${JSON.stringify(createPayload, null, 2).replace(/\n/g, "\n  ")}
}
Response 201:
{
  "${resourceIdField}": "${resourceIdValue}",
  "status": "active",
  "version": 1,
  "createdAt": "2026-06-21T10:00:00Z",
  "links": {
    "self": "/v1/${problem.id}/${profile.primaryResourcePath}/${resourceIdValue}",
    "operations": "/v1/${problem.id}/operations/op_123"
  }
}

---

POST /v1/${problem.id}/${profile.primaryResourcePath}/{${resourceIdField}}/actions/${runtimeAction}
Headers:
{
  "Authorization": "Bearer <access_token>",
  "X-Tenant-Id": "tenant_123",
  "Idempotency-Key": "req_01K..."
}
Request body schema:
{
  "tenantId": "tenant_123",
  "actorId": "user_123",
  "expectedVersion": 1,
  "callbackUrl": "https://client.example.com/webhooks/${problem.id}",
  "payload": ${JSON.stringify(runtimePayload, null, 2).replace(/\n/g, "\n  ")}
}
Response 202:
{
  "${resourceIdField}": "${resourceIdValue}",
  "status": "accepted",
  "operationId": "op_123",
  "statusUrl": "/v1/${problem.id}/operations/op_123",
  "result": {
    "decision": "pending",
    "reason": "${toCamelIdentifier(runtimeOperation.label)}"
  },
  "version": 2
}

---

GET /v1/${problem.id}/${profile.primaryResourcePath}/{${resourceIdField}}
Query:
{
  "tenantId": "tenant_123",
  "include": "status,metadata",
  "readConsistency": "eventual|strong"
}
Response 200:
{
  "${resourceIdField}": "${resourceIdValue}",
  "tenantId": "tenant_123",
  "status": "active",
  "version": 2,
  "etag": "W/\\"${resourceIdValue}:2\\"",
  "freshness": "cache_hit|projection|source_read",
  "data": ${JSON.stringify(createPayload, null, 2).replace(/\n/g, "\n  ")}
}

---

GET /v1/${problem.id}/${profile.primaryResourcePath}?cursor=&limit=50&status=&ownerId=&sort=updatedAt_desc
Response 200:
{
  "items": [
    {
      "${resourceIdField}": "${resourceIdValue}",
      "tenantId": "tenant_123",
      "status": "active",
      "version": 2
    }
  ],
  "pagination": {
    "cursor": "next_cursor",
    "limit": 50,
    "hasMore": true
  },
  "filters": {
    "status": "active",
    "ownerId": "user_123"
  }
}

---

POST /v1/${problem.id}/${profile.primaryResourcePath}:batchGet
Request body schema:
{
  "tenantId": "tenant_123",
  "${resourceIdField}s": ["${resourceIdValue}"],
  "fields": ["status", "version", "metadata"]
}
Response 207:
{
  "results": [
    {
      "${resourceIdField}": "${resourceIdValue}",
      "statusCode": 200,
      "body": { "status": "active", "version": 2 }
    }
  ]
}

---

GET /v1/${problem.id}/operations/{operationId}
Response 200:
{
  "operationId": "op_123",
  "${resourceIdField}": "${resourceIdValue}",
  "status": "pending|succeeded|failed",
  "retryable": true,
  "lastError": null,
  "updatedAt": "2026-06-21T10:00:03Z"
}`;
};

const urlShortenerApiSpecCode = `POST /v1/short-links
Headers:
{
  "Authorization": "Bearer <access_token>",
  "X-Tenant-Id": "tenant_123",
  "Idempotency-Key": "req_01J..."
}
Request body schema:
{
  "tenantId": "tenant_123",
  "ownerId": "user_123",
  "longUrl": "https://example.com/articles/system-design?ref=interview",
  "customAlias": "summer-sale",
  "expiresAt": "2026-07-21T10:00:00Z",
  "callbackUrl": "https://client.example.com/webhooks/short-links"
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
Query:
{
  "preview": false
}
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

GET /v1/short-links?cursor=&limit=50&ownerId=&status=&sort=createdAt_desc
Response 200:
{
  "items": [
    {
      "shortLinkId": "sl_123",
      "slug": "summer-sale",
      "shortUrl": "https://sho.rt/summer-sale",
      "status": "active",
      "version": 1
    }
  ],
  "pagination": {
    "cursor": "next_cursor",
    "limit": 50,
    "hasMore": true
  }
}

---

GET /v1/short-links/{shortLinkId}/analytics?from=&to=&groupBy=day&cursor=&limit=100
Response 200:
{
  "shortLinkId": "sl_123",
  "totalClicks": 18420,
  "uniqueVisitorsApprox": 12600,
  "pagination": {
    "cursor": "next_cursor",
    "limit": 100
  },
  "buckets": [
    { "day": "2026-06-21", "clicks": 932 }
  ]
}

---

GET /v1/operations/{operationId}
Response 200:
{
  "operationId": "op_123",
  "shortLinkId": "sl_123",
  "status": "pending|succeeded|failed",
  "retryable": true,
  "lastError": null
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

const buildApiErrorContractCode = (): string => `Common error response body:
{
  "error": {
    "code": "validation_error|unauthorized|forbidden|not_found|conflict|rate_limited|timeout|dependency_unavailable",
    "message": "Human-readable error",
    "retryable": false,
    "fieldErrors": {
      "payload.exampleField": "required"
    },
    "requestId": "req_123"
  }
}

Status code semantics:
- 400 validation_error: request body, path, query, or schema field is invalid.
- 401 unauthorized: missing or invalid auth token.
- 403 forbidden: authenticated actor lacks authorization for tenant scope.
- 404 not_found: resource identifier or path does not exist in this tenant.
- 409 conflict: version mismatch, duplicate idempotency key with different payload, or uniqueness conflict.
- 422 unprocessable_entity: contract is valid but domain validation failed.
- 429 rate_limited: quota exceeded; include Retry-After and rate limit reset headers.
- 503 timeout or dependency_unavailable: retry with backoff when retryable is true.`;

const buildApiAsyncContractCode = (
  problem: ProblemContext,
  profile: SolutionProfile,
): string => {
  const resourceIdField = `${toCamelIdentifier(profile.primaryResource)}Id`;
  const resourceIdValue = `${toCamelIdentifier(profile.primaryResource)}_123`;
  const eventSubject = toKebabCase(
    requirementSubject(profile.primaryOperation.label) || profile.primaryResource,
  );
  const eventName = `${problem.id}.${eventSubject}.${eventActionForOperation(
    profile.primaryOperation.label,
  )}`.replace(/-/g, ".");

  return `Async event and callback contract:
{
  "eventId": "evt_123",
  "eventType": "${eventName}",
  "tenantId": "tenant_123",
  "actorId": "user_123",
  "${resourceIdField}": "${resourceIdValue}",
  "operationId": "op_123",
  "idempotencyKey": "req_01J...",
  "previousVersion": 1,
  "newVersion": 2,
  "status": "succeeded|failed",
  "occurredAt": "2026-06-21T10:00:05Z",
  "payload": {
    "domain": "${profile.domain}",
    "resource": "${profile.primaryResource}"
  }
}

Delivery:
- Publish the event to the queue or stream after the source-of-truth transaction commits.
- POST the same payload to callbackUrl/webhook subscribers with HMAC signature headers.
- Consumers dedupe by eventId and ${resourceIdField}; callbacks retry with exponential backoff and dead-letter after bounded attempts.`;
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

const DIAGRAM_NODE_WIDTH = 168;
const DIAGRAM_NODE_HEIGHT = 74;

const diagramLabel = (value: string, fallback = "Component"): string => {
  const normalizedValue = value.replace(/\s+/g, " ").trim();

  return (normalizedValue || fallback).slice(0, 80);
};

const diagramNode = (
  id: string,
  kind: SystemDesignNodeKind,
  label: string,
  x: number,
  y: number,
): SystemDesignDiagramNode => ({
  height: DIAGRAM_NODE_HEIGHT,
  id,
  kind,
  label: diagramLabel(label),
  width: DIAGRAM_NODE_WIDTH,
  x,
  y,
});

const diagramConnector = (
  id: string,
  fromNodeId: string,
  toNodeId: string,
  label: string,
  kind: SystemDesignConnectorKind = "one-way",
): SystemDesignDiagramConnector => ({
  fromNodeId,
  id,
  kind,
  label: diagramLabel(label, ""),
  toNodeId,
});

const storeKindForLabel = (label: string): SystemDesignNodeKind => {
  if (/\b(cache|projection|session|presence)\b/i.test(label)) {
    return "cache";
  }

  if (/\b(index|search|vector|embedding|ranking)\b/i.test(label)) {
    return "search";
  }

  if (/\b(object|blob|artifact|media|file|warehouse|lake)\b/i.test(label)) {
    return "storage";
  }

  return "database";
};

const firstMatchingStore = (
  profile: SolutionProfile,
  pattern: RegExp,
  fallback: string,
): string =>
  profile.architecture.stores.find((store) => pattern.test(store)) ?? fallback;

const buildHighLevelDesignDiagram = (
  profile: SolutionProfile,
): SystemDesignDiagram => {
  const primaryStore =
    profile.architecture.stores[0] ?? `${profile.primaryResourceTitle} DB`;
  const servingStore = firstMatchingStore(
    profile,
    /\b(cache|projection|index|search|vector|metadata|serving)\b/i,
    profile.architecture.stores[1] ?? "Cache / Projection",
  );
  const eventStore = firstMatchingStore(
    profile,
    /\b(event|stream|log|queue|ledger|outbox)\b/i,
    profile.architecture.stores[2] ?? "Event Stream",
  );
  const workerLabel = profile.architecture.background[0] ?? "Worker Fleet";

  return {
    connectors: [
      diagramConnector(
        "solution-edge-client-cdn",
        "solution-clients",
        "solution-edge",
        "static",
      ),
      diagramConnector(
        "solution-edge-client-gateway",
        "solution-clients",
        "solution-gateway",
        "API",
      ),
      diagramConnector(
        "solution-edge-cdn-gateway",
        "solution-edge",
        "solution-gateway",
        "edge",
      ),
      diagramConnector(
        "solution-edge-gateway-command",
        "solution-gateway",
        "solution-command-service",
        "mutations",
      ),
      diagramConnector(
        "solution-edge-gateway-query",
        "solution-gateway",
        "solution-query-service",
        "reads",
      ),
      diagramConnector(
        "solution-command-primary-store",
        "solution-command-service",
        "solution-primary-store",
        "source of truth",
      ),
      diagramConnector(
        "solution-command-event-store",
        "solution-command-service",
        "solution-event-store",
        "outbox",
        "async",
      ),
      diagramConnector(
        "solution-query-serving-store",
        "solution-query-service",
        "solution-serving-store",
        "hot reads",
        "bidirectional",
      ),
      diagramConnector(
        "solution-query-primary-store",
        "solution-query-service",
        "solution-primary-store",
        "miss",
        "dependency",
      ),
      diagramConnector(
        "solution-event-workers",
        "solution-event-store",
        "solution-workers",
        "events",
        "async",
      ),
      diagramConnector(
        "solution-workers-serving-store",
        "solution-workers",
        "solution-serving-store",
        "projections",
        "async",
      ),
      diagramConnector(
        "solution-workers-observability",
        "solution-workers",
        "solution-observability",
        "metrics",
        "plain",
      ),
      diagramConnector(
        "solution-gateway-observability",
        "solution-gateway",
        "solution-observability",
        "traces",
        "plain",
      ),
    ],
    nodes: [
      diagramNode("solution-clients", "client", "Clients", 56, 250),
      diagramNode("solution-edge", "cdn", "Edge / CDN", 286, 110),
      diagramNode(
        "solution-gateway",
        "api-gateway",
        `${profile.domainTitle} API Gateway`,
        286,
        250,
      ),
      diagramNode(
        "solution-command-service",
        "service",
        `${profile.primaryResourceTitle} Service`,
        530,
        178,
      ),
      diagramNode(
        "solution-query-service",
        "service",
        `${profile.domainTitle} Query Service`,
        530,
        350,
      ),
      diagramNode(
        "solution-primary-store",
        storeKindForLabel(primaryStore),
        primaryStore,
        786,
        148,
      ),
      diagramNode(
        "solution-serving-store",
        storeKindForLabel(servingStore),
        servingStore,
        786,
        350,
      ),
      diagramNode(
        "solution-event-store",
        /\b(queue)\b/i.test(eventStore) ? "queue" : "stream",
        eventStore,
        786,
        540,
      ),
      diagramNode(
        "solution-workers",
        "worker",
        workerLabel,
        1032,
        540,
      ),
      diagramNode(
        "solution-observability",
        "monitoring",
        "Observability / Audit",
        1032,
        176,
      ),
    ],
    viewport: {
      height: 690,
      width: 1260,
      x: 0,
      y: 0,
    },
  };
};

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
  options: {
    diagramJson?: SystemDesignDiagram | null;
  } = {},
): StageEditorialSeed => ({
  contentHtml: [
    renderParagraph(
      `This is the reference ${stageIntroLabels[stageId]} solution for ${problem.title}.`,
    ),
    renderParagraph(`Scale assumption: ${problem.scale}`),
    ...sections,
  ].join(""),
  diagramJson: options.diagramJson ?? null,
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
  const entityModel = buildCoreEntityModel(problem, profile, operationSubjects);

  return renderSampleSolution(problem, "core-entities", [
    renderParagraph(
      `The data model separates source-of-truth entities, relationship mappings, append-only events, and read projections instead of collapsing the domain into one generic record.`,
    ),
    renderCodeBlock(entityModel.schemaCode),
    renderSection("Core entities", entityModel.coreEntities),
    renderSection("Indexes and access patterns", entityModel.indexes),
    renderSection("Modeling decisions", entityModel.modelingDecisions),
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
          "POST /v1/short-links: create a short link using tenantId, ownerId, longUrl, optional customAlias, expiry, Authorization, X-Tenant-Id, and Idempotency-Key.",
          "GET /{slug}: resolve the public slug path to a 302 redirect, enforce abuse/expiry validation, and emit a redirectServed event asynchronously.",
          "GET /v1/short-links?cursor=&limit=&ownerId=&status=: list links with cursor pagination, filters, stable sorting, tenant scope, and bounded limits.",
          "GET /v1/short-links/{shortLinkId}/analytics?from=&to=&groupBy=&cursor=&limit=: read analytics using filters, pagination, freshness metadata, and versioned response fields.",
          "GET /v1/operations/{operationId}: poll asynchronous creation, analytics rebuild, abuse scan, or callback delivery status.",
        ]
      : [
          `POST /v1/${problem.id}/${profile.primaryResourcePath}: create or configure ${profile.primaryResourcePlural} with tenantId, actorId, request body schema, Authorization, X-Tenant-Id, and Idempotency-Key.`,
          `POST /v1/${problem.id}/${profile.primaryResourcePath}/{${toCamelIdentifier(
            profile.primaryResource,
          )}Id}/actions/${runtimeAction}: execute ${lowerFirst(runtimeOperation.label)} with expectedVersion, callbackUrl, async status, and retry-safe duplicate handling.`,
          `GET /v1/${problem.id}/${profile.primaryResourcePath}/{${toCamelIdentifier(
            profile.primaryResource,
          )}Id}: read current state, metadata, freshness, etag, ownership scope, and version.`,
          `GET /v1/${problem.id}/${profile.primaryResourcePath}?cursor=&limit=&status=&ownerId=&sort=: paginated list endpoint with filters, cursor, page limit, stable sorting, and tenant scope.`,
          `POST /v1/${problem.id}/${profile.primaryResourcePath}:batchGet and GET /v1/${problem.id}/operations/{operationId}: bounded batch reads plus async status polling for long-running work.`,
        ];

  return renderSampleSolution(problem, "api-interface", [
    renderParagraph(
      `The public contract exposes ${profile.domain} operations directly instead of generic CRUD. Mutations are retry-safe and reads are bounded.`,
    ),
    renderCodeBlock(buildApiSpecCode(problem, profile)),
    renderSection("External API contract", apiContractSummaries),
    renderSection("Request and response contracts", [
      "Every request body has a concrete schema with tenantId, actorId or authenticated subject, domain payload fields, clientRequestId, path resource identifiers, and validation rules for required fields.",
      "Every response body returns the resource id, tenant scope, status, version, createdAt/updatedAt where relevant, freshness or etag metadata, and links to self, operation status, retry, or callback resources.",
      "Path identifiers and body identifiers are intentionally separate: the path selects the resource boundary, while body fields carry actor, tenant, expectedVersion, filters, and operation-specific payload.",
      "Versioning uses /v1 paths, additive fields, stable enum values, deprecation windows, and backward compatible response changes.",
    ]),
    renderSection("Pagination, filtering, and batching", [
      "High-volume reads use cursor pagination, page limit caps, stable sort keys, bounded filters, and explicit hasMore/next cursor metadata.",
      "List endpoints filter by tenantId, ownerId, status, time range, and domain-specific fields without allowing unbounded scans.",
      "Batch reads use a capped :batchGet endpoint with partial success status codes so clients do not fan out hundreds of single-resource requests.",
      "The contract names freshness on reads so clients understand when they are seeing cache, projection, or source data.",
    ]),
    renderSection("Internal events", [
      ...profile.operations
        .slice(0, 3)
        .map((operation) => eventContract(problem, profile, operation)),
      "Consumers must be idempotent and use the event ID/resource version as the dedupe key.",
    ]),
    renderCodeBlock(buildApiAsyncContractCode(problem, profile)),
    renderCodeBlock(buildEventSchemaCode(problem, profile)),
    renderSection("Auth, validation, versioning, and errors", [
      "Authentication uses Authorization headers; authorization checks tenant scope, owner scope, role, and quota before the domain service changes state.",
      "Validation errors identify the invalid request body field, query parameter, or path identifier so clients can fix bad contracts.",
      "Rate limits use quota buckets per tenant/actor/resource and return 429 with Retry-After, remaining quota, and reset headers.",
      "Error status codes distinguish 400 validation_error, 401 unauthorized, 403 forbidden, 404 not_found, 409 conflict or duplicate request, 422 domain validation, 429 rate_limited, 503 timeout or dependency_unavailable.",
      "Retryable errors are explicit; mutating APIs require idempotency keys so duplicate retries return the original operation result instead of creating duplicate work.",
    ]),
    renderCodeBlock(buildApiErrorContractCode()),
    renderSection("Contract guarantees", [
      "Authentication, authorization, quota checks, validation, and idempotency happen before committing a mutation.",
      "Slow fan-out, provider calls, indexing, ranking, notifications, or analytics return accepted/status and complete asynchronously.",
      "Async operations return an operationId and statusUrl; completion is delivered by event stream, callback, or webhook and can be safely retried.",
      `The contract handles ${profile.risks.join(", ")} without exposing storage topology to clients.`,
      "Scope tradeoff: the initial version keeps advanced admin workflows, broad analytics exports, and cross-product automation out of scope unless they are central to the prompt.",
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

  return renderSampleSolution(
    problem,
    "high-level-design",
    [
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
    ],
    {
      diagramJson: buildHighLevelDesignDiagram(profile),
    },
  );
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

import type { ProblemContext } from "../../ai/contracts.js";
import type { RequirementCheck, StageRubric } from "../types.js";
import { calendarSchedulerRequirementsRubric } from "./calendar-scheduler.requirements.rubric.js";

type CheckOptions = {
  importance?: RequirementCheck["importance"];
  requiresQuantification?: boolean;
  weight?: number;
};

type CuratedRequirementsSpec = {
  functional: RequirementCheck[];
  nonFunctional?: RequirementCheck[];
  scopeChecks?: RequirementCheck[];
};

const CURATED_REQUIREMENTS_VERSION = "requirements-curated-v1";

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

const baselineNonFunctionalChecks = (
  problem: ProblemContext,
): RequirementCheck[] => [
  check(
    "scale_target",
    "Concrete scale target",
    ["scale", "qps", "rps", "throughput", "users", "events", "messages"],
    "What concrete scale target should the system support?",
    `Quantify the expected workload using the prompt scale: ${problem.scale}.`,
    { requiresQuantification: true, weight: 8 },
  ),
  check(
    "latency_slo",
    "Latency SLOs for critical paths",
    ["latency", "p95", "p99", "response time", "tail latency", "fast"],
    "What latency should the critical read and write paths meet?",
    "Add p95 or p99 latency SLOs for the most important user-facing paths.",
    { requiresQuantification: true, weight: 6 },
  ),
  check(
    "availability_resilience",
    "Availability and resilience",
    ["availability", "uptime", "failover", "replication", "retries", "degrade"],
    "What failures must the system survive without user-visible downtime?",
    "Define availability, failover, retry, and graceful-degradation requirements.",
    { weight: 6 },
  ),
  check(
    "consistency_correctness",
    "Correctness and consistency boundaries",
    ["consistency", "correctness", "idempotency", "ordering", "dedupe"],
    "Where does the system require strong correctness versus eventual consistency?",
    "State consistency, idempotency, ordering, and duplicate-handling expectations for critical operations.",
    { weight: 6 },
  ),
  check(
    "security_abuse",
    "Security, privacy, and abuse controls",
    ["security", "privacy", "authorization", "permissions", "abuse", "fraud"],
    "How should access, privacy, and abuse prevention work?",
    "Add authentication, authorization, privacy, tenant isolation, and abuse-prevention requirements.",
    { importance: "important", weight: 5 },
  ),
  check(
    "observability_operations",
    "Observability and operations",
    ["monitoring", "observability", "metrics", "logs", "alerts", "tracing"],
    "What should operators monitor and alert on in production?",
    "Add metrics, logs, alerts, dashboards, and operational failure signals.",
    { importance: "important", weight: 4 },
  ),
];

const baselineScopeChecks = (problem: ProblemContext): RequirementCheck[] => [
  check(
    "scope_boundaries",
    "Explicit scope boundaries",
    [
      "in scope",
      "out of scope",
      "not in scope",
      "exclude",
      "initial version",
      ...problem.interviewVariants,
    ],
    "What is included in the first version and what is intentionally deferred?",
    "Separate must-have requirements from extensions before architecture work.",
    { importance: "important", weight: 8 },
  ),
];

const curatedRequirementsSpecs: Record<string, CuratedRequirementsSpec> = {
  "url-shortener": {
    functional: [
      check("create_short_link", "Create short links", ["shorten", "short url", "long url", "alias", "slug"], "What fields are required to create a short link?", "Include long URL validation, alias generation, ownership, and creation semantics."),
      check("redirect_resolution", "Fast redirect resolution", ["redirect", "resolve", "lookup", "301", "302"], "How should redirects be resolved quickly?", "Add redirect lookup behavior, cacheability, and redirect status semantics."),
      check("custom_alias_expiry", "Custom aliases and expiration", ["custom slug", "custom alias", "expiry", "expire", "ttl"], "Should users be able to choose aliases and expiry?", "Cover custom aliases, uniqueness validation, expiry, and expired-link behavior."),
      check("click_analytics", "Click analytics", ["analytics", "click", "metrics", "referrer", "location"], "What analytics should be captured per redirect?", "Define click counting, dimensions, privacy limits, and delayed aggregation."),
      check("abuse_hot_links", "Abuse and hot-link handling", ["malicious", "abuse", "phishing", "hot link", "hot key"], "How should malicious URLs and viral links be handled?", "Add abuse scanning, blocklists, rate limits, and hot-key mitigation."),
    ],
  },
  pastebin: {
    functional: [
      check("create_paste", "Create text snippets", ["paste", "snippet", "text", "create"], "What content and metadata are required to create a paste?", "Define paste creation, size limits, visibility, and metadata."),
      check("retrieve_paste", "Retrieve by public link", ["retrieve", "get paste", "public link", "slug"], "How are pastes read by link?", "Add slug lookup, public/private behavior, and not-found semantics."),
      check("expiry_retention", "Expiry and retention", ["expiry", "expire", "ttl", "retention"], "How long should pastes remain available?", "Define optional expiry, deletion, retention, and cleanup behavior."),
      check("payload_limits", "Payload limits and validation", ["size", "limit", "oversized", "payload"], "What content sizes and formats are supported?", "Add text size limits, validation, and oversized-paste handling."),
      check("spam_private_pastes", "Spam control and private pastes", ["spam", "private", "abuse", "visibility"], "How should private or abusive pastes be handled?", "Cover private pastes, access controls, spam detection, and takedown flows."),
    ],
  },
  "rate-limiter": {
    functional: [
      check("policy_definition", "Define rate-limit policies", ["limit", "quota", "policy", "tenant", "rule"], "What entities can have limits?", "Define per-user, IP, tenant, endpoint, and global policies."),
      check("algorithm_choice", "Rate-limit algorithm semantics", ["token bucket", "sliding window", "fixed window", "leaky bucket"], "Which algorithm best matches burst and fairness requirements?", "Specify token bucket, sliding window, or hybrid semantics and burst behavior."),
      check("distributed_enforcement", "Distributed enforcement", ["distributed", "stateless", "sharded", "counter"], "How are limits enforced across many app servers?", "Add shared counter, sharding, and atomic update requirements."),
      check("retry_feedback", "Client feedback", ["retry after", "headers", "remaining", "429"], "What response should blocked clients receive?", "Include 429 behavior, retry-after hints, and remaining quota metadata."),
      check("clock_hot_tenant", "Clock skew and hot tenant protection", ["clock skew", "hot tenant", "failover", "region"], "How should skew and hot keys affect correctness?", "Add clock-skew tolerance, hot-tenant isolation, and failover behavior."),
    ],
  },
  autocomplete: {
    functional: [
      check("prefix_suggestions", "Prefix suggestions", ["prefix", "typeahead", "autocomplete", "suggestion"], "What should be returned for each typed prefix?", "Define prefix matching, minimum query length, and response format."),
      check("ranking_relevance", "Ranking and relevance", ["ranking", "relevance", "popular", "trending"], "How should suggestions be ranked?", "Add popularity, freshness, personalization, and business ranking requirements."),
      check("index_updates", "Index freshness", ["index", "freshness", "update", "trending"], "How quickly should new or trending terms appear?", "Define ingestion, indexing, and freshness expectations."),
      check("language_typo_support", "Language and typo support", ["multilingual", "language", "typo", "spell"], "What language and typo behavior is required?", "Cover normalization, locale support, typo tolerance, and tokenization."),
      check("debounced_low_latency_reads", "Debounced low-latency reads", ["debounce", "latency", "cache", "qps"], "How should the system handle many reads per keystroke?", "Define debouncing, caching, and read-path requirements."),
    ],
  },
  "notification-service": {
    functional: [
      check("multi_channel_send", "Multi-channel notification sends", ["email", "sms", "push", "channel"], "Which channels must be supported?", "Define email, SMS, push, and channel-specific delivery semantics."),
      check("template_rendering", "Template rendering", ["template", "render", "personalization"], "How are notification templates managed and rendered?", "Add template versioning, localization, variable validation, and rendering failure behavior."),
      check("preferences_suppression", "User preferences and suppression", ["preference", "unsubscribe", "quiet hours", "do not disturb"], "How do user preferences affect sends?", "Cover opt-outs, quiet hours, channel preferences, and transactional exceptions."),
      check("retry_provider_failover", "Retries and provider failover", ["retry", "provider", "failover", "backoff"], "How are provider failures handled?", "Define retry policy, backoff, provider routing, and dead-letter behavior."),
      check("delivery_tracking", "Delivery tracking and dedupe", ["delivery", "receipt", "duplicate", "status"], "How should delivery state be tracked?", "Add delivery states, duplicate prevention, provider callbacks, and analytics."),
    ],
  },
  "feature-flags": {
    functional: [
      check("flag_evaluation", "Low-latency flag evaluation", ["evaluate", "sdk", "flag", "read"], "How do SDKs evaluate flags?", "Define SDK evaluation, local cache, fallback values, and read latency expectations."),
      check("targeting_rules", "Targeting rules", ["targeting", "rule", "segment", "attribute"], "What targeting logic is supported?", "Add user attributes, segments, environment targeting, and rule precedence."),
      check("rollouts_kill_switch", "Rollouts and kill switches", ["rollout", "percentage", "kill switch", "rollback"], "How are features rolled out and disabled safely?", "Cover percentage rollout, instant kill switch, and rollback requirements."),
      check("config_distribution", "Configuration distribution", ["distribution", "propagation", "stale", "cache"], "How quickly do flag changes reach SDKs?", "Define propagation, polling/streaming, versioning, and stale-cache behavior."),
      check("audit_experiments", "Audit history and experiments", ["audit", "history", "experiment", "variant"], "How are flag changes audited?", "Include audit trail, approvals, experiment variants, and change ownership."),
    ],
  },
  "session-store": {
    functional: [
      check("session_creation_validation", "Session creation and validation", ["session", "login", "validate", "token"], "What creates and validates a session?", "Define login session creation, token hashing, validation, and lookup behavior."),
      check("ttl_expiry", "TTL and expiry", ["ttl", "expiry", "expire", "timeout"], "How do sessions expire?", "Add idle timeout, absolute expiry, refresh behavior, and cleanup semantics."),
      check("revocation_logout", "Revocation and logout", ["revocation", "logout", "revoke", "invalidate"], "How quickly should logout revoke access?", "Cover single-session logout, global logout, revocation propagation, and stale-token behavior."),
      check("device_scoped_sessions", "Device-scoped sessions", ["device", "concurrent", "session limit"], "Should sessions be tracked per device?", "Add device metadata, concurrent session limits, and device-specific logout."),
      check("regional_replication", "Regional replication", ["region", "replication", "failover"], "How are sessions available across regions?", "Define regional reads, replication lag, and failover behavior."),
    ],
  },
  "audit-log": {
    functional: [
      check("append_only_events", "Append-only event capture", ["append", "audit event", "immutable", "write once"], "What events must be captured?", "Define append-only writes, actor, action, resource, timestamp, and request context."),
      check("tamper_evidence", "Tamper evidence", ["tamper", "hash", "signature", "integrity"], "How can log integrity be verified?", "Add hash chains, signatures, immutable storage, or cryptographic verification."),
      check("query_export", "Query and export", ["query", "search", "export", "filter"], "How will auditors find events?", "Define filters, pagination, export, and tenant-scoped query requirements."),
      check("retention_legal_hold", "Retention and legal holds", ["retention", "legal hold", "delete", "archive"], "How long are audit events retained?", "Cover retention rules, legal holds, archival, and deletion constraints."),
      check("ordering_clock", "Ordering and clock accuracy", ["ordering", "clock", "timestamp", "sequence"], "How should event ordering be represented?", "Add timestamp precision, monotonic sequence, and clock-skew handling."),
    ],
  },
  "api-gateway": {
    functional: [
      check("routing_upstreams", "Routing to upstream services", ["routing", "route", "upstream", "backend"], "How are requests routed to services?", "Define host/path routing, service discovery, retries, and upstream health behavior."),
      check("auth_authorization", "Authentication and authorization", ["authentication", "authorization", "jwt", "oauth"], "Where are auth decisions enforced?", "Add token validation, scopes, tenant context, and auth failure behavior."),
      check("rate_limiting_quotas", "Rate limiting and quotas", ["rate limit", "quota", "throttle", "429"], "How does the gateway protect upstreams?", "Define per-client limits, burst handling, and retry-after responses."),
      check("request_transform_canary", "Transforms and canary routing", ["transform", "canary", "rewrite", "header"], "What request transformations are supported?", "Cover header/path transforms, canary routing, version routing, and validation."),
      check("observability_edge", "Gateway observability", ["logs", "metrics", "tracing", "latency"], "What should be observable at the gateway?", "Add access logs, metrics, tracing, latency, and upstream error reporting."),
    ],
  },
  "distributed-cache": {
    functional: [
      check("cache_operations", "Cache get/set/delete operations", ["get", "set", "delete", "ttl", "key"], "What operations does the cache expose?", "Define basic cache operations, TTL, namespaces, and value limits."),
      check("partitioning_hashing", "Partitioning and consistent hashing", ["consistent hashing", "partition", "shard", "rebalance"], "How are keys distributed?", "Add consistent hashing, shard ownership, rebalancing, and metadata requirements."),
      check("eviction_memory", "Eviction and memory management", ["eviction", "lru", "lfu", "memory", "ttl"], "What happens when memory is full?", "Define eviction policy, TTL expiration, memory limits, and admission behavior."),
      check("replication_failover", "Replication and failover", ["replication", "replica", "failover", "availability"], "How does the cache survive node failure?", "Cover replication, failover, consistency tradeoffs, and data loss expectations."),
      check("invalidation_stampede", "Invalidation and stampede control", ["invalidation", "stale", "stampede", "thundering herd"], "How are stale values and cache stampedes handled?", "Add invalidation, stale-while-revalidate, request coalescing, and hot-key controls."),
    ],
  },
  "metrics-dashboard": {
    functional: [
      check("metrics_ingestion", "Metric ingestion", ["ingest", "sample", "metric", "time series"], "What metric data is accepted?", "Define metric samples, labels, timestamps, validation, and ingestion protocol."),
      check("aggregation_rollups", "Aggregation and rollups", ["aggregation", "rollup", "downsampling", "rate"], "How are raw samples aggregated?", "Add rollups, retention tiers, downsampling, and query-time aggregation."),
      check("alert_rule_evaluation", "Alert rule evaluation", ["alert", "rule", "threshold", "evaluate"], "How are alert rules evaluated?", "Define rule scheduling, windows, notifications, silence, and dedupe behavior."),
      check("dashboard_queries", "Dashboard query serving", ["dashboard", "query", "chart", "range"], "How are dashboards powered?", "Cover range queries, recent data freshness, caching, and cardinality limits."),
      check("cardinality_controls", "High-cardinality controls", ["cardinality", "label", "tenant", "limit"], "How is label cardinality controlled?", "Add label limits, tenant quotas, rejection behavior, and expensive-query protection."),
    ],
  },
  "log-aggregation": {
    functional: [
      check("log_ingestion", "Log ingestion", ["ingest", "collector", "agent", "log"], "How do applications send logs?", "Define agents, batching, validation, timestamps, and tenant metadata."),
      check("indexing_search", "Indexing and search", ["index", "search", "query", "filter"], "What queries must be supported?", "Cover structured fields, free text, filters, pagination, and query limits."),
      check("retention_tiers", "Retention and storage tiers", ["retention", "archive", "tier", "cold storage"], "How long are logs retained?", "Define hot/warm/cold tiers, retention policies, and restore behavior."),
      check("live_tail_investigation", "Live tail and investigation workflows", ["live tail", "stream", "investigation", "trace"], "Should operators inspect recent logs live?", "Add live tail, correlation IDs, and investigation query requirements."),
      check("tenant_isolation_backpressure", "Tenant isolation and backpressure", ["tenant", "backpressure", "drop", "quota"], "How are noisy tenants isolated?", "Define per-tenant quotas, buffering, drop policy, and overload behavior."),
    ],
  },
  "twitter-timeline": {
    functional: [
      check("post_follow_graph", "Posting and follow graph", ["post", "tweet", "follow", "follower"], "What user actions drive the timeline?", "Define posting, follow/unfollow, privacy, and delete behavior."),
      check("home_timeline_generation", "Home timeline generation", ["timeline", "home feed", "fan-out", "feed"], "How is the home timeline built?", "Cover fan-out-on-write, fan-out-on-read, hybrid strategy, and cache behavior."),
      check("ranking_freshness", "Ranking and freshness", ["ranking", "freshness", "recommended", "score"], "How are timeline items ordered?", "Add ranking signals, freshness goals, pagination, and regeneration behavior."),
      check("celebrity_fanout", "Celebrity fan-out handling", ["celebrity", "hot key", "fan-out", "large follower"], "How are high-follower accounts handled?", "Define special fan-out strategy, backpressure, and hot-key mitigation."),
      check("edits_deletes_mutes", "Deletes, edits, mutes, and blocks", ["delete", "edit", "mute", "block"], "How do content changes propagate?", "Cover deletes, edits, muted users, blocks, and stale timeline invalidation."),
    ],
  },
  "instagram-feed": {
    functional: [
      check("media_posting", "Image and media posting", ["image", "media", "post", "upload"], "What content can creators post?", "Define media upload, metadata, captions, and visibility."),
      check("feed_generation", "Feed generation", ["feed", "follow", "timeline", "ranking"], "How is the feed generated?", "Cover follow graph, ranking, pagination, and feed cache requirements."),
      check("media_delivery", "Media delivery", ["cdn", "image", "thumbnail", "delivery"], "How is media delivered to mobile clients?", "Add image variants, CDN delivery, prefetching, and bandwidth-aware behavior."),
      check("engagement_ranking", "Engagement and ranking signals", ["like", "comment", "ranking", "engagement"], "Which signals affect ranking?", "Define likes, comments, recency, creator affinity, and freshness."),
      check("privacy_close_friends", "Privacy and audience controls", ["privacy", "close friends", "block", "visibility"], "Who can view each post?", "Cover private accounts, close friends, blocks, and takedown behavior."),
    ],
  },
  "facebook-news-feed": {
    functional: [
      check("multi_source_feed", "Multi-source feed composition", ["friend", "group", "ad", "recommendation", "feed"], "What content sources appear in the feed?", "Define friend posts, groups, pages, ads, and recommendations."),
      check("privacy_filtering", "Privacy-aware filtering", ["privacy", "permission", "visibility", "block"], "How are privacy rules enforced?", "Add viewer eligibility, blocks, groups privacy, and policy filtering."),
      check("ranking_pipeline", "Multi-stage ranking pipeline", ["ranking", "candidate", "score", "relevance"], "How are candidates ranked?", "Cover candidate generation, ranking, diversity, freshness, and explainability."),
      check("fanout_hybrid", "Hybrid fan-out strategy", ["fan-out", "push", "pull", "cache"], "How are feed candidates materialized?", "Define fan-out strategy for normal users, celebrities, and freshness."),
      check("reactions_ads_integrity", "Reactions, ads, and integrity controls", ["reaction", "ad", "spam", "integrity"], "How are reactions, ads, and unsafe content handled?", "Cover engagement updates, ad insertion, moderation, and integrity signals."),
    ],
  },
  reddit: {
    functional: [
      check("communities_posts", "Communities and posts", ["subreddit", "community", "post", "submit"], "What community and post actions are supported?", "Define community creation, posting, membership, moderation, and visibility."),
      check("comments_threads", "Nested comment threads", ["comment", "thread", "reply", "tree"], "How are deep comment trees represented?", "Cover nested replies, pagination, sorting, and collapse behavior."),
      check("votes_ranking", "Voting and ranking", ["vote", "upvote", "downvote", "ranking", "hot"], "How do votes affect ranking?", "Define vote aggregation, fraud control, hot ranking, and time decay."),
      check("moderation_tooling", "Moderation tooling", ["moderation", "mod", "remove", "ban"], "What moderation actions are required?", "Add removals, bans, reports, automod, and audit history."),
      check("edits_deletes_abuse", "Edits, deletes, and abuse controls", ["edit", "delete", "spam", "abuse"], "How are edited or abusive posts handled?", "Cover edits, deletes, spam, rate limits, and user trust signals."),
    ],
  },
  "linkedin-feed": {
    functional: [
      check("professional_graph", "Professional graph updates", ["connection", "follow", "company", "graph"], "What relationships feed content?", "Define connections, follows, companies, creators, and visibility."),
      check("feed_sources", "Feed source blending", ["job", "post", "creator", "recommendation"], "What content types appear in the feed?", "Cover professional updates, jobs, creator content, and recommendations."),
      check("ranking_context", "Professional ranking context", ["ranking", "relevance", "hiring", "skill"], "How is professional relevance determined?", "Define ranking signals, network distance, freshness, and job relevance."),
      check("entity_enrichment", "Entity enrichment", ["profile", "company", "job", "enrichment"], "How are feed entities hydrated?", "Add profile, company, job, and permission-aware enrichment requirements."),
      check("notifications_coupling", "Notification coupling", ["notification", "digest", "over notify"], "Which feed events trigger notifications?", "Define notification triggers, suppression, digests, and over-notification controls."),
    ],
  },
  whatsapp: {
    functional: [
      check("one_to_one_group_messaging", "One-to-one and group messaging", ["message", "chat", "group", "send"], "What messaging modes are supported?", "Define direct chats, group chats, membership, and message lifecycle."),
      check("delivery_receipts", "Delivery and read receipts", ["delivered", "read receipt", "ack", "receipt"], "What receipt states should clients see?", "Cover sent, delivered, read, failed, and retry states."),
      check("e2ee_key_management", "End-to-end encryption and key management", ["encryption", "e2e", "key", "ratchet"], "How are messages encrypted across devices?", "Add key setup, rotation, group keys, and compromised-device behavior."),
      check("offline_sync", "Offline and mobile sync", ["offline", "sync", "mobile", "store and forward"], "How do offline users receive messages?", "Define store-and-forward, reconnect sync, ordering, and dedupe."),
      check("media_multi_device", "Media and multi-device support", ["media", "attachment", "multi-device", "device"], "How do attachments and multiple devices work?", "Cover media upload/download, device fan-out, and attachment retention."),
    ],
  },
  slack: {
    functional: [
      check("workspace_channels", "Workspaces and channels", ["workspace", "channel", "member", "tenant"], "How are workspaces and channels modeled?", "Define tenant isolation, channel membership, roles, and visibility."),
      check("messaging_threads", "Messages and threaded conversations", ["message", "thread", "reply", "reaction"], "How do channel messages and threads work?", "Cover messages, thread replies, edits, deletes, reactions, and ordering."),
      check("realtime_delivery", "Real-time delivery", ["websocket", "realtime", "presence", "fan-out"], "How do users receive live updates?", "Define websocket fan-out, connection state, backfill, and presence updates."),
      check("search_history", "Search and history", ["search", "history", "index", "retention"], "How is message history searched?", "Cover indexing, permission-filtered search, retention, and backfills."),
      check("integrations_workflows", "Integrations and workflows", ["integration", "bot", "workflow", "webhook"], "What integration surfaces are required?", "Add bot/webhook events, workflow execution, app permissions, and rate limits."),
    ],
  },
  "presence-service": {
    functional: [
      check("presence_states", "Presence states", ["online", "away", "active", "status"], "What presence states are supported?", "Define online, away, offline, active, invisible, and custom status behavior."),
      check("heartbeats_sessions", "Heartbeats and sessions", ["heartbeat", "session", "socket", "ttl"], "How is presence updated?", "Cover heartbeat interval, TTL, device sessions, and disconnect handling."),
      check("fanout_visibility", "Fan-out and visibility", ["fan-out", "subscriber", "visibility", "privacy"], "Who receives presence updates?", "Define subscriptions, privacy rules, tenant visibility, and fan-out limits."),
      check("staleness_flapping", "Staleness and flapping control", ["stale", "flapping", "debounce", "last seen"], "How are unstable connections represented?", "Add debouncing, last-seen timestamps, and stale state transitions."),
      check("multi_device", "Multi-device aggregation", ["device", "mobile", "desktop", "multi-device"], "How do multiple devices combine into one presence state?", "Define aggregation rules, priority, and per-device metadata."),
    ],
  },
  "email-service": {
    functional: [
      check("send_receive_mail", "Send and receive email", ["send", "receive", "smtp", "mail"], "What mail flows are supported?", "Define outbound SMTP, inbound receiving, delivery retries, and bounce handling."),
      check("mailbox_folders", "Mailbox folders and labels", ["mailbox", "folder", "label", "archive"], "How are mailboxes organized?", "Cover inbox, folders, labels, unread state, and moves."),
      check("threading_search", "Threading and search", ["thread", "search", "index", "full text"], "How are email threads and search represented?", "Define conversation threading, full-text search, attachments, and permission filters."),
      check("spam_filtering", "Spam and abuse filtering", ["spam", "phishing", "reputation", "filter"], "How are bad messages detected?", "Add spam scoring, phishing detection, sender reputation, and quarantine."),
      check("attachments_retention", "Attachments and retention", ["attachment", "retention", "storage", "large file"], "How are large attachments stored and retained?", "Cover attachment upload, virus scanning, quotas, and retention policies."),
    ],
  },
  "push-fanout": {
    functional: [
      check("device_token_management", "Device token management", ["device token", "apns", "fcm", "token"], "How are device tokens registered and retired?", "Define token registration, invalidation, platform metadata, and churn handling."),
      check("provider_routing", "Provider routing", ["provider", "apns", "fcm", "gateway", "route"], "How are pushes routed to providers?", "Cover provider selection, batching, credentials, and regional routing."),
      check("retry_backpressure", "Retries and backpressure", ["retry", "backpressure", "quota", "rate limit"], "How are provider limits handled?", "Define retries, exponential backoff, provider quotas, and drop policy."),
      check("suppression_preferences", "Suppression and preferences", ["quiet hours", "preference", "suppression", "priority"], "Which pushes should be suppressed?", "Cover quiet hours, transactional priority, user preferences, and dedupe."),
      check("delivery_analytics", "Delivery analytics", ["delivery", "open", "analytics", "receipt"], "How is delivery measured?", "Add provider receipts, opens, failures, and delivery analytics."),
    ],
  },
  "video-conferencing": {
    functional: [
      check("meeting_rooms", "Meeting rooms and participants", ["room", "meeting", "participant", "join"], "How do users create and join meetings?", "Define room lifecycle, invites, admission, roles, and participant limits."),
      check("media_routing", "Media routing", ["sfu", "mcu", "media", "audio", "video"], "How is audio/video routed?", "Specify SFU/MCU expectations, track forwarding, and media session control."),
      check("adaptive_quality", "Adaptive bitrate and network quality", ["bitrate", "jitter", "packet loss", "adapt"], "How does quality adapt to network changes?", "Add bitrate adaptation, simulcast, jitter handling, and fallback behavior."),
      check("screen_record_chat", "Screen sharing, recording, and chat", ["screen share", "recording", "chat", "transcription"], "Which meeting features are required?", "Cover screen share, chat, recording, transcription, and permissions."),
      check("large_meetings", "Large meeting and webinar behavior", ["large meeting", "webinar", "breakout", "audience"], "How do large rooms differ from small meetings?", "Define audience mode, speaker limits, breakout rooms, and scaling constraints."),
    ],
  },
  youtube: {
    functional: [
      check("video_upload", "Video upload", ["upload", "video", "creator", "metadata"], "How do creators upload videos?", "Define resumable upload, metadata, validation, and publish states."),
      check("transcoding_pipeline", "Transcoding pipeline", ["transcode", "encoding", "rendition", "codec"], "How are videos processed after upload?", "Add transcoding jobs, renditions, thumbnails, and failure recovery."),
      check("streaming_delivery", "Streaming delivery", ["stream", "cdn", "playback", "hls", "dash"], "How are videos streamed globally?", "Cover adaptive streaming, CDN delivery, cache behavior, and playback manifests."),
      check("search_recommendations", "Search and recommendations", ["search", "recommendation", "ranking", "metadata"], "How do users discover videos?", "Define metadata indexing, search ranking, recommendations, and freshness."),
      check("copyright_creator_analytics", "Copyright and creator analytics", ["copyright", "claim", "analytics", "creator"], "How are rights and creator insights handled?", "Add copyright enforcement, takedowns, view analytics, and monetization hooks."),
    ],
  },
  netflix: {
    functional: [
      check("catalog_discovery", "Catalog and discovery", ["catalog", "title", "metadata", "discovery"], "How do users browse titles?", "Define catalog metadata, search, personalization, and regional availability."),
      check("playback_streaming", "Playback streaming", ["playback", "stream", "bitrate", "manifest"], "How is content streamed?", "Cover adaptive bitrate, manifests, DRM, CDN selection, and device compatibility."),
      check("resume_state", "Playback continuity", ["resume", "watch history", "progress", "profile"], "How is watch progress synchronized?", "Add profile state, resume position, cross-device sync, and conflict handling."),
      check("recommendations_personalization", "Personalized recommendations", ["recommendation", "personalization", "ranking", "profile"], "How are titles recommended?", "Define recommendations, rows, ranking, freshness, and feedback signals."),
      check("licensing_downloads", "Licensing and downloads", ["license", "region", "download", "offline"], "How do rights restrictions affect playback?", "Cover regional licensing, offline downloads, expiry, and entitlement checks."),
    ],
  },
  spotify: {
    functional: [
      check("music_playback", "Music playback", ["playback", "stream", "track", "audio"], "How do users play tracks?", "Define track streaming, buffering, seek, pause, and playback state."),
      check("playlist_library", "Playlists and library", ["playlist", "library", "album", "artist"], "How are user libraries managed?", "Cover playlist CRUD, collaborative playlists, ordering, and library saves."),
      check("search_discovery", "Search and discovery", ["search", "recommendation", "discovery", "ranking"], "How do users find music?", "Define search, recommendations, browse surfaces, and ranking signals."),
      check("cross_device_sync", "Cross-device state sync", ["device", "sync", "handoff", "connect"], "How does playback move between devices?", "Add device discovery, handoff, remote control, and conflict resolution."),
      check("rights_offline", "Rights restrictions and offline caching", ["rights", "license", "offline", "download"], "How do licensing rules affect playback?", "Cover regional rights, offline cache, expiry, and entitlement checks."),
    ],
  },
  "live-streaming": {
    functional: [
      check("live_ingest", "Live video ingest", ["ingest", "broadcast", "rtmp", "stream"], "How do broadcasters send live video?", "Define ingest protocol, validation, stream keys, and reconnect behavior."),
      check("low_latency_delivery", "Low-latency delivery", ["low latency", "hls", "webrtc", "cdn", "edge"], "What latency target is required for viewers?", "Cover low-latency delivery, CDN fan-out, buffering, and protocol choice."),
      check("chat_moderation", "Live chat and moderation", ["chat", "moderation", "spam", "ban"], "How is live chat moderated?", "Define chat fan-out, slow mode, moderation, reporting, and spam controls."),
      check("dvr_clips", "DVR rewind and clips", ["dvr", "rewind", "clip", "record"], "Should viewers rewind or clip live content?", "Add DVR window, clip creation, recording, and storage behavior."),
      check("viral_spike_scaling", "Viral spike scaling", ["viral", "spike", "autoscale", "hot"], "How does the platform handle sudden audience spikes?", "Define autoscaling, edge warmup, queueing, and degraded-mode behavior."),
    ],
  },
  "stories-service": {
    functional: [
      check("story_creation", "Story creation", ["story", "reel", "upload", "media"], "How do users create short-lived media?", "Define media upload, captions, privacy, and publish behavior."),
      check("expiry_lifecycle", "Expiry lifecycle", ["expiry", "24 hour", "expire", "delete"], "How do stories expire?", "Cover 24-hour expiry, cleanup, archive, and deletion behavior."),
      check("viewer_sequence", "Viewer sequence and ranking", ["viewer", "sequence", "ranking", "feed"], "How are stories ordered for viewers?", "Define ranking, creator affinity, viewed state, and pagination."),
      check("privacy_viewers", "Privacy and viewer lists", ["privacy", "close friends", "viewer list", "visibility"], "Who can view each story?", "Cover close friends, blocks, viewer lists, and privacy changes."),
      check("media_prefetch", "Media prefetch and mobile delivery", ["prefetch", "media", "cdn", "mobile"], "How is media loaded quickly on mobile?", "Add CDN delivery, prefetching, adaptive media, and bandwidth controls."),
    ],
  },
  "image-hosting": {
    functional: [
      check("image_upload", "Image upload", ["upload", "image", "metadata", "album"], "How do users upload images?", "Define upload flow, metadata, validation, and ownership."),
      check("transform_resizing", "Image transforms and resizing", ["resize", "transform", "thumbnail", "variant"], "What image variants are generated?", "Cover thumbnails, resizing, format conversion, and transform cache behavior."),
      check("cdn_delivery", "CDN delivery and signed access", ["cdn", "delivery", "signed url", "cache"], "How are images delivered globally?", "Define CDN caching, signed URLs, cache invalidation, and origin behavior."),
      check("metadata_search", "Metadata search and tagging", ["metadata", "search", "tag", "index"], "How do users find images?", "Add metadata indexing, tags, album browsing, and AI tagging if in scope."),
      check("duplicate_abuse", "Duplicate and abuse handling", ["duplicate", "hash", "abuse", "moderation"], "How are duplicate or abusive images handled?", "Cover deduplication, perceptual hashes, moderation, and takedown flows."),
    ],
  },
  "cloud-drive": {
    functional: [
      check("file_folder_model", "Files and folders", ["file", "folder", "metadata", "hierarchy"], "How are files and folders represented?", "Define hierarchy, metadata, ownership, moves, and renames."),
      check("sync_protocol", "Device sync protocol", ["sync", "device", "delta", "offline"], "How do devices synchronize changes?", "Cover delta sync, offline edits, conflict resolution, and checkpoints."),
      check("chunk_dedup_storage", "Chunking and deduplication", ["chunk", "dedupe", "hash", "storage"], "How are large files stored efficiently?", "Define chunking, content hashes, dedupe, upload resume, and integrity checks."),
      check("sharing_permissions", "Sharing and permissions", ["share", "permission", "link", "access"], "How do users share files?", "Cover ACLs, link sharing, enterprise policies, and revocation."),
      check("versioning_recovery", "Versioning and recovery", ["version", "history", "restore", "ransomware"], "How can users recover prior versions?", "Add version history, restore, trash, ransomware recovery, and retention."),
    ],
  },
  "object-storage": {
    functional: [
      check("bucket_object_api", "Bucket and object API", ["bucket", "object", "put", "get", "delete"], "What object APIs are required?", "Define bucket/object CRUD, metadata, range reads, and errors."),
      check("durability_replication", "Durability and replication", ["durability", "replication", "region", "checksum"], "What durability guarantee is required?", "Cover replication, checksums, repair, and regional durability."),
      check("namespace_listing", "Namespace and listing", ["namespace", "prefix", "list", "metadata"], "How are objects listed and addressed?", "Define key namespace, prefix listing, pagination, and metadata partitioning."),
      check("multipart_lifecycle", "Multipart upload and lifecycle rules", ["multipart", "lifecycle", "versioning", "tier"], "How are large objects and lifecycle handled?", "Add multipart upload, versioning, lifecycle, archival tiers, and cleanup."),
      check("access_events_locking", "Access control and object locking", ["iam", "signed url", "object lock", "event"], "How is object access controlled?", "Cover IAM, signed URLs, object lock, event notifications, and audit."),
    ],
  },
  "file-storage": {
    functional: [
      check("file_chunking", "File chunking", ["chunk", "block", "file", "hash"], "How are large files split and addressed?", "Define chunk size, hashes, metadata, and reconstruction."),
      check("replication_placement", "Replication and placement", ["replication", "placement", "rack", "data center"], "Where are file chunks placed?", "Cover replication factor, placement policy, failure domains, and repair."),
      check("retrieval_downloads", "Fast retrieval and downloads", ["download", "retrieve", "signed url", "read"], "How do clients retrieve files?", "Define read path, signed downloads, range reads, and CDN integration."),
      check("repair_integrity", "Repair and integrity", ["repair", "checksum", "corrupt", "scrub"], "How are corrupt or missing chunks repaired?", "Add checksums, scrubbing, repair jobs, and replica health tracking."),
      check("erasure_resumable", "Erasure coding and resumable upload", ["erasure", "resumable", "upload", "coding"], "Which storage optimizations are in scope?", "Decide on erasure coding, resumable upload, and tradeoffs versus replication."),
    ],
  },
  "collaborative-docs": {
    functional: [
      check("document_model", "Document model", ["document", "paragraph", "operation", "revision"], "How is document content represented?", "Define document structure, operations, revisions, and metadata."),
      check("realtime_collaboration", "Real-time collaboration", ["real-time", "ot", "crdt", "cursor"], "How do concurrent edits merge?", "Specify OT or CRDT semantics, cursor presence, and convergence."),
      check("comments_suggestions", "Comments and suggestions", ["comment", "suggestion", "resolve", "mention"], "What collaboration features are required?", "Cover comments, suggestions, mentions, and notification behavior."),
      check("version_history", "Version history", ["version", "history", "restore", "revision"], "How can users inspect or restore prior versions?", "Add version history, snapshots, diffs, and restore requirements."),
      check("offline_large_content", "Offline edits and large content", ["offline", "paste", "large", "conflict"], "How are offline and large edits handled?", "Define offline edit replay, conflict handling, and large paste limits."),
    ],
  },
  "collaborative-whiteboard": {
    functional: [
      check("canvas_object_model", "Canvas object model", ["canvas", "object", "stroke", "shape"], "How are board objects represented?", "Define shapes, freehand strokes, z-order, metadata, and IDs."),
      check("delta_sync", "Delta sync", ["delta", "sync", "real-time", "collaboration"], "How are board changes synchronized?", "Cover delta updates, ordering, reconnect backfill, and conflict behavior."),
      check("viewport_culling", "Viewport culling and rendering", ["viewport", "culling", "render", "large board"], "How do clients handle large boards?", "Add viewport queries, object culling, level-of-detail, and pagination."),
      check("presence_comments", "Presence and comments", ["presence", "cursor", "comment", "pointer"], "What collaborator signals are shown?", "Define cursors, comments, pointer updates, and rate limits."),
      check("assets_versions", "Assets and version restore", ["asset", "upload", "version", "restore"], "How are embedded assets and board history handled?", "Cover asset uploads, embedded media, templates, snapshots, and restore."),
    ],
  },
  "kanban-board": {
    functional: [
      check("cards_columns", "Cards and columns", ["card", "column", "board", "task"], "How are cards and columns modeled?", "Define board, column, card, fields, assignments, labels, and comments."),
      check("ordering_moves", "Ordering and card moves", ["order", "move", "rank", "drag"], "How are cards ordered within columns?", "Cover rank keys, concurrent moves, reordering, and conflict behavior."),
      check("activity_feed", "Activity feed and audit history", ["activity", "audit", "history", "event"], "What changes are visible in history?", "Add activity log, comments, assignment changes, and audit retention."),
      check("permissions", "Permissions and enterprise access", ["permission", "role", "workspace", "tenant"], "Who can view or edit boards?", "Define roles, board visibility, tenant isolation, and sharing."),
      check("realtime_automations", "Real-time sync and automations", ["real-time", "websocket", "automation", "watcher"], "How do watchers see updates?", "Cover websocket updates, watcher fan-out, automations, and notification limits."),
    ],
  },
  "ride-sharing": {
    functional: [
      check("rider_driver_matching", "Rider-driver matching", ["match", "driver", "rider", "nearby"], "How are riders matched to drivers?", "Define matching criteria, distance, availability, acceptance, and timeout behavior."),
      check("location_tracking", "Real-time location tracking", ["location", "gps", "tracking", "geospatial"], "How are driver and trip locations tracked?", "Cover location updates, geospatial indexing, stale location handling, and privacy."),
      check("trip_lifecycle", "Trip lifecycle", ["trip", "state", "pickup", "dropoff"], "What are the trip states?", "Define request, matched, accepted, arrived, picked up, completed, canceled, and failure states."),
      check("pricing_payments", "Pricing and payments", ["price", "surge", "fare", "payment"], "How are fares calculated and charged?", "Cover upfront pricing, surge, payment authorization, refunds, and receipts."),
      check("scheduled_pooling", "Scheduled rides and pooling scope", ["scheduled", "pooling", "airport", "geofence"], "Which ride variants are in scope?", "Decide on pooling, scheduled rides, airport geofences, and deferment rules."),
    ],
  },
  "food-delivery": {
    functional: [
      check("order_lifecycle", "Order lifecycle", ["order", "restaurant", "status", "fulfillment"], "What are the order states?", "Define cart, placed, accepted, preparing, picked up, delivered, canceled, and refund states."),
      check("courier_dispatch", "Courier dispatch", ["dispatch", "courier", "driver", "assignment"], "How are couriers assigned?", "Cover dispatch criteria, batching, acceptance, reassignment, and double-dispatch prevention."),
      check("eta_tracking", "ETA and live tracking", ["eta", "tracking", "location", "route"], "How is ETA computed and updated?", "Define ETA inputs, live courier tracking, delay handling, and user notifications."),
      check("restaurant_marketplace", "Restaurant availability and menus", ["restaurant", "menu", "availability", "substitution"], "How are restaurant state and menus handled?", "Cover menu availability, item substitutions, prep times, and restaurant delays."),
      check("promos_batched_deliveries", "Promos and batched deliveries scope", ["promotion", "promo", "batch", "grocery"], "Which marketplace extensions are in scope?", "Decide on promos, batched deliveries, grocery substitutions, and deferrals."),
    ],
  },
  "route-planner": {
    functional: [
      check("route_computation", "Route computation", ["route", "directions", "shortest path", "path"], "What route outputs are required?", "Define route request inputs, distance/time output, turn-by-turn instructions, and alternatives."),
      check("road_graph_model", "Road graph model", ["graph", "road", "edge", "node"], "How is the road network represented?", "Cover graph nodes/edges, restrictions, map versions, and updates."),
      check("traffic_updates", "Traffic-aware routing", ["traffic", "weight", "incident", "eta"], "How do traffic changes affect routes?", "Define traffic ingestion, freshness, ETA updates, and rerouting behavior."),
      check("graph_partitioning", "Graph partitioning and query speed", ["partition", "contraction", "precompute", "cache"], "How are continental-scale graphs queried quickly?", "Add partitioning, precomputation, caching, and cold-route behavior."),
      check("multi_stop_constraints", "Multi-stop and EV constraints", ["multi-stop", "ev", "charging", "alternate"], "Which advanced routing variants are in scope?", "Decide on multi-stop routes, EV charging, alternate routes, and scope boundaries."),
    ],
  },
  "geofence-alerts": {
    functional: [
      check("geofence_definition", "Geofence definition", ["geofence", "polygon", "circle", "boundary"], "What geofence shapes are supported?", "Define circle/polygon fences, metadata, tenants, and limits."),
      check("location_sampling", "Battery-aware location sampling", ["sampling", "gps", "battery", "location"], "How often are device locations sampled?", "Cover adaptive sampling, battery impact, accuracy, and OS constraints."),
      check("enter_exit_detection", "Enter and exit detection", ["enter", "exit", "cross", "alert"], "How are crossing events detected?", "Define enter/exit rules, hysteresis, dwell time, and duplicate suppression."),
      check("spatial_indexing", "Spatial indexing", ["spatial", "index", "overlap", "nearby"], "How are overlapping fences queried?", "Add spatial index, candidate filtering, and many-overlap handling."),
      check("offline_uploads", "Offline event uploads", ["offline", "upload", "dedupe", "sync"], "How are offline crossings handled?", "Cover local buffering, upload ordering, dedupe, and late events."),
    ],
  },
  "payment-gateway": {
    functional: [
      check("payment_intents", "Payment intents and lifecycle", ["payment intent", "authorize", "capture", "charge"], "What payment states are required?", "Define intent creation, authorization, capture, void, refund, and failure states."),
      check("idempotency", "Idempotency and duplicate prevention", ["idempotency", "duplicate", "retry", "idempotency key"], "How are duplicate payment requests prevented?", "Require idempotency keys, replay behavior, and safe retry semantics."),
      check("processor_routing", "Processor and bank integrations", ["processor", "bank", "acquirer", "gateway"], "How are external payment providers integrated?", "Cover provider routing, timeouts, retries, fallback, and reconciliation."),
      check("settlement_webhooks", "Settlement and webhooks", ["settlement", "webhook", "callback", "merchant"], "How are merchants notified?", "Define webhook delivery, retries, signatures, ordering, and settlement updates."),
      check("fraud_compliance", "Fraud and compliance", ["fraud", "3ds", "pci", "compliance"], "What fraud and compliance requirements apply?", "Add fraud checks, 3DS, PCI boundaries, regional compliance, and audit trails."),
    ],
  },
  "digital-wallet": {
    functional: [
      check("ledger_model", "Ledger model", ["ledger", "journal", "entry", "transaction"], "How are balances represented?", "Require double-entry ledger, immutable journal entries, and transaction IDs."),
      check("balance_transfers", "Balances and transfers", ["balance", "transfer", "debit", "credit"], "How do users move money?", "Define balance reads, holds, transfers, debit/credit semantics, and limits."),
      check("atomicity_idempotency", "Atomicity and idempotency", ["atomic", "idempotency", "duplicate", "replay"], "How are duplicate or partial transfers prevented?", "Cover transactional atomicity, idempotency keys, and replay protection."),
      check("reconciliation", "Reconciliation and auditability", ["reconciliation", "audit", "settlement", "drift"], "How is ledger correctness verified?", "Add reconciliation, audit reports, drift detection, and correction flows."),
      check("fraud_reserves", "Fraud controls and reserve holds", ["fraud", "hold", "reserve", "risk"], "How are risky transfers handled?", "Define fraud scoring, reserve holds, manual review, and release behavior."),
    ],
  },
  "checkout-service": {
    functional: [
      check("cart_checkout_flow", "Cart checkout flow", ["cart", "checkout", "order", "place order"], "What is the checkout flow?", "Define cart review, checkout submission, validation, and order creation."),
      check("pricing_snapshot", "Pricing snapshot", ["price", "pricing", "tax", "promotion", "snapshot"], "How are prices kept correct?", "Require pricing snapshot, promo application, tax calculation, and mismatch handling."),
      check("inventory_reservation", "Inventory reservation", ["inventory", "reservation", "stock", "oversell"], "How is inventory reserved?", "Define reservation TTL, oversell prevention, release, and partial availability."),
      check("payment_order_orchestration", "Payment and order orchestration", ["payment", "orchestration", "saga", "partial failure"], "How do payment and order creation interact?", "Cover payment authorization, order state, compensating actions, and failure recovery."),
      check("guest_split_shipments", "Guest checkout and split shipments", ["guest", "split shipment", "shipment", "tax"], "Which checkout variants are in scope?", "Decide on guest checkout, split shipments, tax recalculation, and deferrals."),
    ],
  },
  "inventory-management": {
    functional: [
      check("stock_tracking", "Stock tracking", ["stock", "quantity", "sku", "inventory"], "What inventory quantities are tracked?", "Define on-hand, available, reserved, damaged, and warehouse-specific quantities."),
      check("reservation_model", "Reservation model", ["reservation", "hold", "ttl", "availability"], "How does the system reserve stock?", "Cover reservation TTL, release, confirmation, and stale reservations."),
      check("warehouse_partitioning", "Warehouse-aware availability", ["warehouse", "partition", "location", "availability"], "How are warehouses represented?", "Define warehouse inventory, regional availability, and partitioning requirements."),
      check("reconciliation_adjustments", "Reconciliation and adjustments", ["reconciliation", "adjustment", "cycle count", "drift"], "How are stock discrepancies corrected?", "Add reconciliation jobs, manual adjustments, audit, and drift alerts."),
      check("flash_sales_bundles", "Flash sales and bundle SKUs", ["flash sale", "bundle", "sku", "safety stock"], "Which inventory variants are in scope?", "Cover flash-sale controls, bundle SKU semantics, and safety stock."),
    ],
  },
  "order-tracking": {
    functional: [
      check("order_state_timeline", "Order state timeline", ["order", "status", "timeline", "state"], "What statuses are shown to users?", "Define order states across payment, fulfillment, shipping, delivery, returns, and cancellation."),
      check("event_ingestion", "Event ingestion", ["event", "ingest", "shipment", "payment"], "How do downstream systems update status?", "Cover event contracts, ordering, dedupe, and late events."),
      check("status_aggregation", "Status aggregation", ["aggregate", "state", "projection", "view"], "How is the customer-facing state computed?", "Define projections, precedence rules, partial shipments, and consistency."),
      check("notifications", "Customer notifications", ["notification", "email", "push", "delay"], "When should users be notified?", "Add notification triggers, dedupe, preferences, and proactive delay alerts."),
      check("courier_returns", "Courier tracking and returns scope", ["courier", "map", "return", "partial"], "Which advanced tracking flows are included?", "Decide on courier map tracking, partial returns, and delay prediction."),
    ],
  },
  "promotion-engine": {
    functional: [
      check("rule_definition", "Promotion rule definition", ["rule", "coupon", "promotion", "discount"], "How are promotion rules authored?", "Define coupons, automatic promotions, conditions, actions, and eligibility."),
      check("rule_evaluation", "Deterministic rule evaluation", ["evaluate", "priority", "stack", "deterministic"], "How are multiple promotions resolved?", "Cover priority, exclusivity, stacking, deterministic evaluation, and explainability."),
      check("pricing_correctness", "Pricing correctness", ["price", "cart", "discount", "tax"], "How are discounts applied safely?", "Add cart snapshot, currency, tax interactions, and final price guarantees."),
      check("abuse_limits", "Abuse prevention and usage limits", ["abuse", "limit", "redemption", "fraud"], "How are promo abuses prevented?", "Define redemption limits, user eligibility, fraud checks, and audit."),
      check("simulation_loyalty", "Campaign simulation and loyalty tiers", ["simulation", "loyalty", "tier", "campaign"], "What advanced campaign tools are in scope?", "Cover campaign simulations, loyalty tiers, stackable promos, and rollout safety."),
    ],
  },
  "fraud-detection": {
    functional: [
      check("risk_scoring", "Real-time risk scoring", ["score", "risk", "transaction", "fraud"], "What entities are scored?", "Define transaction scoring inputs, score output, latency, and decision thresholds."),
      check("feature_pipelines", "Feature pipelines", ["feature", "pipeline", "online", "offline"], "How are features generated and served?", "Cover online/offline features, freshness, joins, and feature store behavior."),
      check("rules_models", "Rules and model decisions", ["rule", "model", "decision", "block"], "How do rules and models combine?", "Define rule engine, model score, allow/block/review decisions, and overrides."),
      check("feedback_loop", "Feedback loops and labels", ["feedback", "label", "chargeback", "case"], "How does the system learn from outcomes?", "Add delayed labels, chargebacks, manual review, and retraining data."),
      check("explainability_false_positive", "Explainability and false-positive control", ["explain", "false positive", "manual review", "appeal"], "How are good users protected?", "Cover reason codes, review tooling, appeals, and false-positive monitoring."),
    ],
  },
  "search-engine": {
    functional: [
      check("crawl_fetch", "Crawling and fetching", ["crawl", "fetch", "url", "document"], "How are documents discovered and fetched?", "Define frontier, fetch scheduling, politeness, and parsing."),
      check("indexing_pipeline", "Indexing pipeline", ["index", "inverted", "document", "freshness"], "How do documents enter the searchable index?", "Cover parsing, tokenization, inverted index, freshness, and deletes."),
      check("ranking_serving", "Ranking and serving", ["ranking", "query", "result", "serve"], "How are query results ranked?", "Define retrieval, scoring, pagination, snippets, and latency."),
      check("sharding_freshness", "Sharding and freshness", ["shard", "partition", "freshness", "merge"], "How is a huge corpus queried?", "Add sharding, query fan-out, merge, cache, and freshness requirements."),
      check("spam_ads_semantic", "Spam, ads, and semantic search scope", ["spam", "ads", "semantic", "vertical"], "Which ranking extensions are in scope?", "Decide on spam controls, ads blending, semantic ranking, and vertical search."),
    ],
  },
  "web-crawler": {
    functional: [
      check("url_frontier", "URL frontier", ["frontier", "url", "queue", "priority"], "How are URLs scheduled for crawl?", "Define frontier priority, dedupe, per-domain queues, and revisit policy."),
      check("politeness_robots", "Politeness and robots handling", ["robots", "politeness", "rate limit", "domain"], "How are site policies respected?", "Cover robots.txt, crawl delay, per-domain rate limits, and exclusions."),
      check("fetch_parse", "Fetch and content extraction", ["fetch", "parse", "extract", "content"], "How are pages fetched and parsed?", "Define fetch retries, content extraction, status handling, and canonicalization."),
      check("dedupe_traps", "Deduplication and crawler traps", ["dedupe", "duplicate", "trap", "canonical"], "How are duplicate or infinite URL spaces avoided?", "Add URL normalization, content hashes, trap detection, and loop controls."),
      check("revisit_sitemaps", "Revisit scheduling and sitemaps", ["revisit", "sitemap", "change detection", "freshness"], "How are pages recrawled?", "Cover sitemap ingestion, change detection, and freshness priorities."),
    ],
  },
  "ad-click-counter": {
    functional: [
      check("impression_click_ingest", "Impression and click ingestion", ["impression", "click", "event", "ingest"], "What ad events are accepted?", "Define event schema, ad/campaign IDs, timestamps, and ingestion path."),
      check("deduplication", "Deduplication", ["dedupe", "duplicate", "idempotency", "event id"], "How are duplicate clicks avoided?", "Require event IDs, dedupe windows, retry semantics, and idempotent writes."),
      check("aggregation_reporting", "Aggregation and reporting", ["aggregation", "dashboard", "report", "count"], "How are counts reported?", "Define near-real-time counts, batch correction, dimensions, and dashboard freshness."),
      check("late_events_billing", "Late events and billing accuracy", ["late", "billing", "accuracy", "backfill"], "How do late events affect billing?", "Cover watermarking, late arrival, backfills, and billing reconciliation."),
      check("fraud_filtering", "Fraud filtering", ["fraud", "bot", "invalid traffic", "filter"], "How are fraudulent clicks filtered?", "Add bot detection, invalid traffic filtering, and auditability."),
    ],
  },
  recommendations: {
    functional: [
      check("candidate_generation", "Candidate generation", ["candidate", "retrieval", "recall", "source"], "Where do recommendation candidates come from?", "Define collaborative, content, graph, trending, and fallback candidate sources."),
      check("ranking_pipeline", "Ranking pipeline", ["ranking", "score", "model", "feature"], "How are candidates ranked?", "Cover feature retrieval, model scoring, business rules, diversity, and freshness."),
      check("feedback_loop", "Feedback loops", ["feedback", "click", "impression", "label"], "How does user behavior improve recommendations?", "Define impressions, clicks, conversions, labels, and retraining signals."),
      check("cold_start_bias", "Cold start and bias controls", ["cold start", "bias", "exploration", "diversity"], "How are new users/items and feedback bias handled?", "Add fallback recommendations, exploration, de-biasing, and diversity requirements."),
      check("sponsored_explanations", "Sponsored items and explanations", ["sponsored", "explanation", "real-time personalization"], "Which advanced surfaces are in scope?", "Decide on sponsored blending, explanations, and real-time personalization."),
    ],
  },
  "analytics-pipeline": {
    functional: [
      check("event_ingestion", "Event ingestion", ["event", "ingest", "stream", "collector"], "How are product events collected?", "Define event schema, collectors, batching, validation, and tenant context."),
      check("schema_registry", "Schema registry and validation", ["schema", "registry", "validation", "evolution"], "How are schema changes managed?", "Add schema versions, compatibility rules, rejection behavior, and evolution."),
      check("stream_batch_paths", "Streaming and batch paths", ["stream", "batch", "warehouse", "load"], "How are real-time and batch outputs produced?", "Cover stream processing, warehouse loads, batch backfills, and consistency."),
      check("dedupe_replay", "Deduplication and replay", ["dedupe", "replay", "backfill", "duplicate"], "How are replays safe?", "Define event IDs, idempotent processing, backfills, and duplicate handling."),
      check("pii_governance_exports", "PII governance and exports", ["pii", "governance", "export", "retention"], "How is sensitive analytics data governed?", "Add PII classification, retention, deletion, customer exports, and access controls."),
    ],
  },
  "time-series-database": {
    functional: [
      check("write_ingestion", "High-ingest writes", ["write", "ingest", "point", "sample"], "How are time-series points ingested?", "Define metric identity, timestamp, labels, validation, and write batching."),
      check("partition_compaction", "Partitioning and compaction", ["partition", "compaction", "segment", "shard"], "How is data organized on disk?", "Cover time partitioning, label partitioning, compaction, and write amplification."),
      check("range_queries", "Range queries", ["query", "range", "scan", "filter"], "What query patterns are required?", "Define range queries, label filters, aggregation, and recent-window reads."),
      check("downsampling_retention", "Downsampling and retention", ["downsampling", "retention", "rollup", "tier"], "How is old data retained efficiently?", "Add rollups, retention windows, tiered storage, and query behavior across tiers."),
      check("cardinality_control", "High-cardinality control", ["cardinality", "label", "exemplar", "tenant"], "How is label explosion prevented?", "Define label limits, tenant quotas, rejection, and expensive-query protection."),
    ],
  },
  "pub-sub": {
    functional: [
      check("topic_partition_model", "Topics and partitions", ["topic", "partition", "stream", "log"], "How are event streams organized?", "Define topics, partitions, keys, ordering, and append-only log semantics."),
      check("producer_publish", "Producer publish semantics", ["producer", "publish", "ack", "batch"], "What publish guarantees are required?", "Cover batching, acknowledgements, idempotent producers, and failure behavior."),
      check("consumer_groups_offsets", "Consumer groups and offsets", ["consumer group", "offset", "commit", "replay"], "How do consumers read and replay?", "Define consumer groups, offset commits, replay, and lag visibility."),
      check("replication_failover", "Replication and leader failover", ["replication", "leader", "failover", "isr"], "How is data protected during broker failure?", "Add replication factor, leader election, durability, and data-loss expectations."),
      check("rebalance_retention_exactly_once", "Rebalancing, retention, and exactly-once scope", ["rebalance", "retention", "exactly once", "mirror"], "Which advanced Kafka-like features are in scope?", "Decide on rebalancing, retention, exactly-once semantics, tiering, and mirroring."),
    ],
  },
  "task-queue": {
    functional: [
      check("enqueue_dequeue", "Enqueue and dequeue jobs", ["enqueue", "dequeue", "job", "task"], "What job lifecycle is supported?", "Define enqueue, lease, acknowledge, fail, retry, and completion states."),
      check("lease_visibility", "Lease and visibility timeout", ["lease", "visibility timeout", "ack", "timeout"], "How do workers claim jobs safely?", "Cover lease duration, renewal, timeout, and re-delivery behavior."),
      check("retries_dead_letter", "Retries and dead-letter queues", ["retry", "dead letter", "backoff", "failure"], "How are failed tasks handled?", "Add retry policy, backoff, max attempts, DLQ, and inspection."),
      check("scheduling_priority", "Scheduling and priority", ["schedule", "priority", "delayed", "fair"], "How are jobs ordered?", "Define delayed jobs, priority queues, fairness, and starvation prevention."),
      check("worker_progress_tracing", "Worker progress and tracing", ["worker", "progress", "trace", "status"], "How do operators debug jobs?", "Add job status, progress updates, logs, tracing, and worker heartbeats."),
    ],
  },
  "job-scheduler": {
    functional: [
      check("schedule_definition", "Schedule definition", ["schedule", "cron", "trigger", "one-off"], "What schedules are supported?", "Define cron, one-off, recurring, timezone, and validation semantics."),
      check("trigger_evaluation", "Trigger evaluation", ["trigger", "evaluate", "due", "timezone"], "How are due jobs detected?", "Cover trigger scanning, time zones, clock skew, and missed trigger handling."),
      check("dedupe_execution", "Deduped execution", ["dedupe", "duplicate", "run", "idempotency"], "How are duplicate runs prevented?", "Require run IDs, idempotency, leases, and failover behavior."),
      check("dependencies_backfills", "Dependencies and backfills", ["dependency", "backfill", "catch up", "workflow"], "Which workflow features are in scope?", "Define job dependencies, catch-up, backfills, and skip behavior."),
      check("execution_tracking", "Execution tracking", ["execution", "status", "history", "retry"], "How are runs tracked?", "Add run history, retries, logs, status, and alerting requirements."),
    ],
  },
  cdn: {
    functional: [
      check("edge_cache", "Edge caching", ["edge", "cache", "object", "ttl"], "What content is cached at edge?", "Define cache keys, TTL, object size limits, and cache-control behavior."),
      check("request_routing", "Request routing", ["routing", "dns", "anycast", "edge"], "How are users routed to edge locations?", "Cover DNS/anycast routing, health, proximity, and failover."),
      check("origin_shielding", "Origin shielding", ["origin", "shield", "miss", "fetch"], "How is origin protected from cache misses?", "Add origin shielding, collapsed forwarding, retries, and overload behavior."),
      check("purge_invalidation", "Purge and invalidation", ["purge", "invalidate", "propagation", "stale"], "How are cached objects invalidated?", "Define purge API, propagation target, stale behavior, and consistency."),
      check("ddos_signed_video", "DDoS, signed URLs, and video scope", ["ddos", "signed url", "edge compute", "video"], "Which edge security and media features are required?", "Cover DDoS mitigation, signed URLs, edge compute, and video optimization scope."),
    ],
  },
  "service-discovery": {
    functional: [
      check("service_registration", "Service registration", ["register", "instance", "service", "metadata"], "How do instances register?", "Define instance metadata, TTL, zones, versions, and deregistration."),
      check("health_checks", "Health checks", ["health", "heartbeat", "check", "liveness"], "How is instance health determined?", "Cover active/passive checks, heartbeat TTL, draining, and failure detection."),
      check("lookup_watch", "Lookup and watch APIs", ["lookup", "watch", "discover", "endpoint"], "How do clients find services?", "Define lookup, streaming watch, caching, and update semantics."),
      check("consistency_failover", "Consistency and failover", ["consistency", "split brain", "failover", "zone"], "How does discovery behave during partitions?", "Add consistency model, regional failover, split-brain prevention, and convergence."),
      check("weighted_routing", "Weighted and zone-aware routing", ["weighted", "zone", "traffic", "routing"], "Which routing policies are in scope?", "Decide on weighted routing, zone preference, graceful draining, and load balancing hints."),
    ],
  },
  "config-service": {
    functional: [
      check("config_storage", "Configuration storage", ["config", "key", "value", "environment"], "How is configuration modeled?", "Define applications, environments, config keys, values, and metadata."),
      check("versioning_validation", "Versioning and validation", ["version", "schema", "validation", "diff"], "How are config changes validated?", "Add schema validation, version history, diffs, and approvals."),
      check("safe_distribution", "Safe distribution", ["distribution", "propagation", "client", "cache"], "How do services receive config?", "Define polling/streaming, client cache, propagation SLO, and stale behavior."),
      check("rollback_blast_radius", "Rollback and blast-radius control", ["rollback", "staged", "canary", "blast radius"], "How are bad configs rolled back?", "Cover staged rollout, canary, instant rollback, and environment isolation."),
      check("audit_secrets", "Audit and secret references", ["audit", "secret", "reference", "permission"], "How are sensitive configs handled?", "Add audit logs, permissions, secret references, and access controls."),
    ],
  },
  "identity-sso": {
    functional: [
      check("federation_flows", "Federation flows", ["saml", "oidc", "oauth", "federation"], "Which federation protocols are supported?", "Define SAML, OIDC, OAuth flows, metadata, and callback validation."),
      check("token_service", "Token issuance and validation", ["token", "jwt", "refresh", "claims"], "How are tokens issued and checked?", "Cover access tokens, refresh tokens, claims, signing keys, and rotation."),
      check("tenant_policy", "Tenant policy control", ["tenant", "policy", "mfa", "step-up"], "How do tenants configure auth policy?", "Define tenant IdPs, MFA, step-up auth, session duration, and enforcement."),
      check("session_jit_provisioning", "Sessions and JIT provisioning", ["session", "jit", "provision", "scim"], "How are users created and sessions managed?", "Cover just-in-time user creation, SCIM, group mapping, and session revocation."),
      check("security_replay_audience", "Replay and audience protection", ["replay", "audience", "nonce", "state"], "How are federation attacks prevented?", "Add nonce/state checks, audience validation, replay prevention, and audit logs."),
    ],
  },
  "vector-search": {
    functional: [
      check("vector_ingestion", "Vector ingestion", ["embedding", "vector", "ingest", "upsert"], "How are vectors inserted and updated?", "Define vector schema, dimensions, metadata, upsert, and delete behavior."),
      check("ann_index", "ANN index selection", ["ann", "hnsw", "ivf", "index"], "What ANN index behavior is required?", "Cover index type, build/update strategy, recall, and latency tradeoffs."),
      check("metadata_filtering", "Metadata filtering", ["metadata", "filter", "tenant", "attribute"], "How do filters interact with vector search?", "Define pre/post filtering, tenant isolation, and correctness expectations."),
      check("freshness_reindexing", "Freshness and reindexing", ["freshness", "reindex", "embedding", "stale"], "How are updated embeddings handled?", "Add incremental indexing, re-embedding, stale vector handling, and background rebuilds."),
      check("hybrid_multimodal", "Hybrid and multimodal retrieval", ["hybrid", "keyword", "multimodal", "recall"], "Which retrieval variants are in scope?", "Decide on keyword blending, multimodal search, recall measurement, and ranking."),
    ],
  },
  "model-serving": {
    functional: [
      check("model_registry", "Model registry", ["model registry", "version", "artifact", "metadata"], "How are model versions managed?", "Define registry, artifacts, metadata, lineage, and approvals."),
      check("online_inference", "Online inference API", ["inference", "predict", "endpoint", "latency"], "How do clients call models?", "Define prediction API, request/response schema, batching, and timeouts."),
      check("traffic_splitting", "Traffic splitting and rollout safety", ["traffic split", "canary", "rollback", "version"], "How are new models rolled out?", "Cover canary, A/B testing, rollback, shadow traffic, and approvals."),
      check("feature_retrieval", "Feature retrieval", ["feature", "feature store", "skew", "lookup"], "How are online features fetched?", "Define feature store lookup, freshness, training-serving skew, and fallback."),
      check("autoscaling_drift", "Autoscaling and drift monitoring", ["autoscale", "gpu", "cpu", "drift", "monitor"], "How does serving scale and monitor quality?", "Add CPU/GPU autoscaling, cold starts, drift metrics, and model health alerts."),
    ],
  },
  jira: {
    functional: [
      check("issue_project_model", "Projects and issues", ["project", "issue", "ticket", "field"], "How are projects and issues modeled?", "Define projects, issue types, fields, comments, attachments, and relationships."),
      check("workflow_engine", "Workflow engine", ["workflow", "status", "transition", "custom"], "How do issues move through workflows?", "Cover custom workflows, transitions, validators, and permissions."),
      check("boards_search", "Boards and search", ["board", "search", "jql", "query"], "How do users find and organize work?", "Define board views, filters, search/JQL, pagination, and indexing."),
      check("permissions_tenants", "Enterprise permissions", ["permission", "tenant", "role", "access"], "Who can view and edit issues?", "Cover tenant isolation, project roles, field security, and permission-filtered queries."),
      check("automation_custom_fields", "Automations and custom fields", ["automation", "custom field", "portfolio", "report"], "Which enterprise extensions are in scope?", "Decide on automations, custom fields, portfolio reporting, and workflow sprawl controls."),
    ],
  },
  "support-ticketing": {
    functional: [
      check("ticket_conversations", "Tickets and conversations", ["ticket", "conversation", "customer", "message"], "How do conversations become tickets?", "Define ticket creation, channels, customer identity, messages, and attachments."),
      check("routing_assignment", "Routing and assignment", ["routing", "assignment", "agent", "queue"], "How are tickets assigned to agents?", "Cover queues, skills, priority, assignment, and reassignment."),
      check("sla_evaluation", "SLA evaluation", ["sla", "breach", "deadline", "policy"], "How are SLA deadlines tracked?", "Define SLA policies, timers, pauses, breaches, and escalations."),
      check("search_audit_history", "Search and audit history", ["search", "history", "audit", "conversation"], "How do agents find and audit tickets?", "Add search, conversation history, audit logs, and tenant filters."),
      check("triage_macros_analytics", "Triage, macros, and analytics", ["triage", "macro", "csat", "analytics"], "Which agent productivity tools are in scope?", "Cover AI triage, macros, CSAT, analytics, and deferrals."),
    ],
  },
};

export const curatedRequirementsProblemIds = Object.keys(
  curatedRequirementsSpecs,
);

export const getCuratedRequirementsRubric = (
  problem: ProblemContext,
): StageRubric | null => {
  if (problem.id === calendarSchedulerRequirementsRubric.problemId) {
    return calendarSchedulerRequirementsRubric;
  }

  const spec = curatedRequirementsSpecs[problem.id];

  if (!spec) {
    return null;
  }

  return {
    problemId: problem.id,
    stageId: "requirements",
    version: `${CURATED_REQUIREMENTS_VERSION}:${problem.id}`,
    scoring: {
      functionalWeight: 45,
      nonFunctionalWeight: 35,
      specificityWeight: 5,
      scopeWeight: 10,
      problemAlignmentWeight: 5,
    },
    functional: spec.functional,
    nonFunctional: [
      ...baselineNonFunctionalChecks(problem),
      ...(spec.nonFunctional ?? []),
    ],
    scopeChecks: [...baselineScopeChecks(problem), ...(spec.scopeChecks ?? [])],
  };
};

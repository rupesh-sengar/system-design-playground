import type { StageRubric } from "../types.js";

export const calendarSchedulerRequirementsRubric: StageRubric = {
  problemId: "calendar-scheduler",
  stageId: "requirements",
  version: "requirements-v1",
  scoring: {
    functionalWeight: 40,
    nonFunctionalWeight: 30,
    specificityWeight: 15,
    scopeWeight: 10,
    problemAlignmentWeight: 5,
  },
  functional: [
    {
      id: "create_event",
      label: "Create events",
      weight: 6,
      keywords: ["create event", "create events", "schedule event", "add event"],
      importance: "critical",
      followUpQuestion: "What information is required to create an event?",
      improvementSuggestion:
        "Add event creation with title, start time, end time, organizer, attendees, location, and description.",
    },
    {
      id: "invite_attendees",
      label: "Invite attendees",
      weight: 6,
      keywords: ["invite", "attendee", "attendees", "participants", "guest"],
      importance: "critical",
      followUpQuestion: "How should attendees be invited and notified?",
      improvementSuggestion:
        "Add attendee invitation flow, including email/user lookup and notification behavior.",
    },
    {
      id: "free_busy_lookup",
      label: "Check free/busy availability",
      weight: 8,
      keywords: [
        "free availability",
        "availability",
        "free busy",
        "free/busy",
        "conflict",
        "available slot",
      ],
      importance: "critical",
      followUpQuestion:
        "How will the system check whether attendees are free before booking?",
      improvementSuggestion:
        "Add free/busy lookup and conflict detection as an explicit requirement.",
    },
    {
      id: "view_calendar",
      label: "View calendar",
      weight: 4,
      keywords: [
        "view calendar",
        "calendar view",
        "get calendar",
        "list events",
        "view events",
      ],
      importance: "important",
      followUpQuestion: "What calendar views should be supported?",
      improvementSuggestion:
        "Add calendar views such as day, week, month, and agenda.",
    },
    {
      id: "update_cancel_event",
      label: "Update or cancel events",
      weight: 5,
      keywords: [
        "update event",
        "cancel event",
        "delete event",
        "modify event",
        "reschedule",
      ],
      importance: "critical",
      followUpQuestion:
        "How should updates and cancellations be propagated to attendees?",
      improvementSuggestion:
        "Add update/cancel event flows and attendee notification behavior.",
    },
    {
      id: "recurring_events",
      label: "Recurring events",
      weight: 9,
      keywords: [
        "recurring",
        "recurrence",
        "repeat",
        "daily",
        "weekly",
        "monthly",
        "rrule",
      ],
      importance: "critical",
      followUpQuestion: "What types of recurring events should be supported?",
      improvementSuggestion:
        "Add recurring event support such as daily, weekly, monthly, custom recurrence rules, and exception handling.",
    },
    {
      id: "timezone_handling",
      label: "Timezone handling",
      weight: 8,
      keywords: [
        "timezone",
        "time zone",
        "utc",
        "local time",
        "user timezone",
        "convert time",
      ],
      importance: "critical",
      followUpQuestion:
        "How should the system store and display event times across timezones?",
      improvementSuggestion:
        "Add timezone handling, including UTC storage, user timezone display, and daylight saving time behavior.",
    },
    {
      id: "shared_calendar",
      label: "Shared calendars",
      weight: 6,
      keywords: [
        "shared calendar",
        "share calendar",
        "calendar sharing",
        "permissions",
        "access control",
      ],
      importance: "important",
      followUpQuestion: "How should shared calendars and permissions work?",
      improvementSuggestion:
        "Add shared calendar support with read/write permissions and visibility controls.",
    },
    {
      id: "accept_decline_invitation",
      label: "Accept/decline invitations",
      weight: 5,
      keywords: ["accept", "decline", "rsvp", "tentative", "respond to invite"],
      importance: "important",
      followUpQuestion: "How should attendees respond to invitations?",
      improvementSuggestion:
        "Add RSVP behavior with accept, decline, and tentative states.",
    },
  ],
  nonFunctional: [
    {
      id: "high_availability",
      label: "High availability",
      weight: 6,
      keywords: ["high availability", "availability", "99.9", "99.99", "uptime"],
      requiresQuantification: true,
      quantificationHints: ["99.9%", "99.99%"],
      importance: "critical",
      followUpQuestion:
        "What availability target should the calendar system provide?",
      improvementSuggestion:
        "Quantify availability, for example 99.9% or 99.99% uptime.",
    },
    {
      id: "low_latency_reads",
      label: "Low latency reads",
      weight: 6,
      keywords: [
        "low latency",
        "latency",
        "fast reads",
        "p95",
        "p99",
        "100ms",
        "200ms",
      ],
      requiresQuantification: true,
      quantificationHints: ["p95 < 200ms", "p99 < 500ms"],
      importance: "critical",
      followUpQuestion: "What latency target should calendar reads meet?",
      improvementSuggestion:
        "Quantify read latency, for example p95 calendar view under 200ms.",
    },
    {
      id: "strong_event_write_consistency",
      label: "Strong consistency for event writes",
      weight: 6,
      keywords: [
        "strong consistency",
        "consistent writes",
        "event writes",
        "double booking",
      ],
      importance: "critical",
      followUpQuestion: "Where is strong consistency required?",
      improvementSuggestion:
        "Clarify that event writes and conflict checks require strong consistency to avoid double booking.",
    },
    {
      id: "eventual_notification_consistency",
      label: "Eventual consistency for notifications",
      weight: 4,
      keywords: [
        "eventual consistency",
        "notifications",
        "async notification",
        "eventually",
      ],
      importance: "important",
      followUpQuestion: "Can notifications be eventually consistent?",
      improvementSuggestion:
        "State that notifications can be asynchronous and eventually consistent.",
    },
    {
      id: "scalability",
      label: "Scalability",
      weight: 6,
      keywords: ["scalability", "scale", "millions", "qps", "throughput", "users"],
      requiresQuantification: true,
      quantificationHints: ["millions of users", "read QPS", "write QPS"],
      importance: "critical",
      followUpQuestion: "What scale target should the system support?",
      improvementSuggestion:
        "Quantify scale, for example active users, events per user, read QPS, and write QPS.",
    },
    {
      id: "durability",
      label: "Data durability",
      weight: 5,
      keywords: [
        "durability",
        "data loss",
        "backup",
        "restore",
        "rpo",
        "rto",
        "disaster recovery",
      ],
      importance: "critical",
      followUpQuestion: "What data loss tolerance is acceptable?",
      improvementSuggestion:
        "Add durability requirements such as backups, RPO, RTO, and disaster recovery.",
    },
    {
      id: "security_authorization",
      label: "Security and authorization",
      weight: 5,
      keywords: [
        "security",
        "authorization",
        "auth",
        "permissions",
        "privacy",
        "access control",
      ],
      importance: "critical",
      followUpQuestion:
        "How should private calendars and shared calendars be protected?",
      improvementSuggestion:
        "Add authentication, authorization, privacy, and permission requirements.",
    },
    {
      id: "observability",
      label: "Monitoring and observability",
      weight: 3,
      keywords: ["monitoring", "observability", "metrics", "logs", "alerts"],
      importance: "nice-to-have",
      followUpQuestion: "What should be monitored in production?",
      improvementSuggestion:
        "Add monitoring for latency, errors, notification failures, and availability lookup failures.",
    },
  ],
  scopeChecks: [
    {
      id: "out_of_scope",
      label: "Out-of-scope definition",
      weight: 10,
      keywords: [
        "out of scope",
        "not in scope",
        "exclude",
        "not support",
        "initial version",
      ],
      importance: "important",
      followUpQuestion:
        "What features are out of scope for the initial design?",
      improvementSuggestion:
        "Define out-of-scope items such as booking links, meeting rooms, delegation, or third-party calendar sync.",
    },
  ],
};

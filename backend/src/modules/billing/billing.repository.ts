import type { QueryResultRow } from "pg";
import type { PostgresDatabase } from "../../database/postgres.js";
import type { OnboardingProfileInput } from "./contracts.js";

export type PlanTier = "free" | "plus" | "pro";
export type SubscriptionStatus =
  | "created"
  | "authenticated"
  | "active"
  | "pending"
  | "halted"
  | "cancelled"
  | "completed"
  | "expired"
  | "paused"
  | "resumed";
export type BillingPlanSource = "admin" | "default" | "subscription";
export type UsageEventType = "ai_hint" | "ai_validation";
export type RazorpayWebhookProcessingStatus =
  | "processing"
  | "processed"
  | "ignored"
  | "failed";

type IsoDateValue = Date | string | null;

const toIsoString = (value: IsoDateValue): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return new Date(value).toISOString();
  }

  throw new Error("Expected timestamp value.");
};

const toNullableIsoString = (value: IsoDateValue): string | null =>
  value === null ? null : toIsoString(value);

const getRequiredRow = <Row>(row: Row | undefined, message: string): Row => {
  if (!row) {
    throw new Error(message);
  }

  return row;
};

export interface BillingCustomerRecord {
  razorpayCustomerId: string;
  updatedAt: string;
  userId: string;
}

export interface BillingAccountRecord {
  createdAt: string;
  monthlyAiQuotaOverride: number | null;
  planSource: BillingPlanSource;
  planTier: PlanTier;
  updatedAt: string;
  userId: string;
}

export interface UserSubscriptionRecord {
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  currentPeriodStart: string | null;
  planTier: PlanTier;
  razorpayPlanId: string | null;
  razorpaySubscriptionId: string | null;
  status: SubscriptionStatus;
  updatedAt: string;
}

export interface OnboardingProfileRecord {
  completedAt: string | null;
  experienceLevel: string | null;
  focusAreas: string[];
  interviewTimeline: string | null;
  targetRole: string | null;
  updatedAt: string;
}

export interface RazorpayWebhookProcessingClaim {
  eventRecordId: string | null;
  shouldProcess: boolean;
}

const mapBillingCustomerRecord = (
  row: QueryResultRow & {
    razorpay_customer_id: string;
    updated_at: IsoDateValue;
    user_id: string;
  },
): BillingCustomerRecord => ({
  razorpayCustomerId: row.razorpay_customer_id,
  updatedAt: toIsoString(row.updated_at),
  userId: row.user_id,
});

const mapBillingAccountRecord = (
  row: QueryResultRow & {
    created_at: IsoDateValue;
    monthly_ai_quota_override: number | null;
    plan_source: BillingPlanSource;
    plan_tier: PlanTier;
    updated_at: IsoDateValue;
    user_id: string;
  },
): BillingAccountRecord => ({
  createdAt: toIsoString(row.created_at),
  monthlyAiQuotaOverride: row.monthly_ai_quota_override,
  planSource: row.plan_source,
  planTier: row.plan_tier,
  updatedAt: toIsoString(row.updated_at),
  userId: row.user_id,
});

const mapSubscriptionRecord = (
  row: QueryResultRow & {
    cancel_at_period_end: boolean;
    current_period_end: IsoDateValue;
    current_period_start: IsoDateValue;
    plan_tier: PlanTier;
    razorpay_plan_id: string | null;
    razorpay_subscription_id: string | null;
    status: SubscriptionStatus;
    updated_at: IsoDateValue;
  },
): UserSubscriptionRecord => ({
  cancelAtPeriodEnd: row.cancel_at_period_end,
  currentPeriodEnd: toNullableIsoString(row.current_period_end),
  currentPeriodStart: toNullableIsoString(row.current_period_start),
  planTier: row.plan_tier,
  razorpayPlanId: row.razorpay_plan_id,
  razorpaySubscriptionId: row.razorpay_subscription_id,
  status: row.status,
  updatedAt: toIsoString(row.updated_at),
});

const mapOnboardingProfileRecord = (
  row: QueryResultRow & {
    completed_at: IsoDateValue;
    experience_level: string | null;
    focus_areas: string[] | null;
    interview_timeline: string | null;
    target_role: string | null;
    updated_at: IsoDateValue;
  },
): OnboardingProfileRecord => ({
  completedAt: toNullableIsoString(row.completed_at),
  experienceLevel: row.experience_level,
  focusAreas: row.focus_areas ?? [],
  interviewTimeline: row.interview_timeline,
  targetRole: row.target_role,
  updatedAt: toIsoString(row.updated_at),
});

const formatWebhookProcessingError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Webhook processing failed.";
};

export class RazorpayWebhookEventRepository {
  constructor(private readonly database: PostgresDatabase) {}

  async claimForProcessing(input: {
    eventId: string | null;
    eventName: string;
    payload: unknown;
  }): Promise<RazorpayWebhookProcessingClaim> {
    const payload = JSON.stringify(input.payload ?? {});

    if (!input.eventId) {
      const result = await this.database.query<{ id: string }>(
        `
          insert into razorpay_webhook_events (
            event_name,
            payload,
            processing_status
          )
          values ($1, $2::jsonb, 'processing')
          returning id
        `,
        [input.eventName, payload],
      );

      return {
        eventRecordId: result.rows[0]?.id ?? null,
        shouldProcess: true,
      };
    }

    const result = await this.database.query<{ id: string }>(
      `
        with attempted_insert as (
          insert into razorpay_webhook_events (
            razorpay_event_id,
            event_name,
            payload,
            processing_status
          )
          values ($1, $2, $3::jsonb, 'processing')
          on conflict (razorpay_event_id)
          do nothing
          returning id
        ),
        attempted_retry as (
          update razorpay_webhook_events
          set
            event_name = $2,
            payload = $3::jsonb,
            processing_status = 'processing',
            error_message = null,
            processed_at = null,
            updated_at = now()
          where razorpay_event_id = $1
            and (
              processing_status = 'failed'
              or (
                processing_status = 'processing'
                and updated_at < now() - interval '10 minutes'
              )
            )
          returning id
        )
        select id from attempted_insert
        union all
        select id from attempted_retry
        limit 1
      `,
      [input.eventId, input.eventName, payload],
    );

    return {
      eventRecordId: result.rows[0]?.id ?? null,
      shouldProcess: Boolean(result.rows[0]),
    };
  }

  async markIgnored(eventRecordId: string): Promise<void> {
    await this.markFinished(eventRecordId, "ignored");
  }

  async markProcessed(eventRecordId: string): Promise<void> {
    await this.markFinished(eventRecordId, "processed");
  }

  async markFailed(eventRecordId: string, error: unknown): Promise<void> {
    await this.database.query(
      `
        update razorpay_webhook_events
        set
          processing_status = 'failed',
          error_message = $2,
          processed_at = null,
          updated_at = now()
        where id = $1
      `,
      [eventRecordId, formatWebhookProcessingError(error)],
    );
  }

  private async markFinished(
    eventRecordId: string,
    status: Extract<RazorpayWebhookProcessingStatus, "processed" | "ignored">,
  ): Promise<void> {
    await this.database.query(
      `
        update razorpay_webhook_events
        set
          processing_status = $2,
          error_message = null,
          processed_at = now(),
          updated_at = now()
        where id = $1
      `,
      [eventRecordId, status],
    );
  }
}

export class BillingAccountRepository {
  constructor(private readonly database: PostgresDatabase) {}

  async ensureForUser(userId: string): Promise<BillingAccountRecord> {
    const result = await this.database.query<{
      created_at: IsoDateValue;
      monthly_ai_quota_override: number | null;
      plan_source: BillingPlanSource;
      plan_tier: PlanTier;
      updated_at: IsoDateValue;
      user_id: string;
    }>(
      `
        insert into user_billing_accounts (
          user_id
        )
        values ($1)
        on conflict (user_id)
        do update set
          updated_at = user_billing_accounts.updated_at
        returning
          user_id,
          plan_tier,
          plan_source,
          monthly_ai_quota_override,
          created_at,
          updated_at
      `,
      [userId],
    );

    return mapBillingAccountRecord(
      getRequiredRow(
        result.rows[0],
        "Billing account ensure returned no row.",
      ),
    );
  }

  async syncFromSubscription(input: {
    planTier: PlanTier;
    status: SubscriptionStatus;
    userId: string;
  }): Promise<BillingAccountRecord> {
    const isActivePaidSubscription =
      input.planTier !== "free" &&
      (input.status === "authenticated" || input.status === "active");
    const nextPlanTier = isActivePaidSubscription ? input.planTier : "free";
    const nextPlanSource: BillingPlanSource = isActivePaidSubscription
      ? "subscription"
      : "default";
    const result = await this.database.query<{
      created_at: IsoDateValue;
      monthly_ai_quota_override: number | null;
      plan_source: BillingPlanSource;
      plan_tier: PlanTier;
      updated_at: IsoDateValue;
      user_id: string;
    }>(
      `
        insert into user_billing_accounts (
          user_id,
          plan_tier,
          plan_source
        )
        values ($1, $2, $3)
        on conflict (user_id)
        do update set
          plan_tier = case
            when user_billing_accounts.plan_source = 'admin'
              then user_billing_accounts.plan_tier
            else excluded.plan_tier
          end,
          plan_source = case
            when user_billing_accounts.plan_source = 'admin'
              then user_billing_accounts.plan_source
            else excluded.plan_source
          end,
          updated_at = now()
        returning
          user_id,
          plan_tier,
          plan_source,
          monthly_ai_quota_override,
          created_at,
          updated_at
      `,
      [input.userId, nextPlanTier, nextPlanSource],
    );

    return mapBillingAccountRecord(
      getRequiredRow(
        result.rows[0],
        "Billing account subscription sync returned no row.",
      ),
    );
  }
}

export class BillingCustomerRepository {
  constructor(private readonly database: PostgresDatabase) {}

  async findByUserId(userId: string): Promise<BillingCustomerRecord | null> {
    const result = await this.database.query<{
      razorpay_customer_id: string;
      updated_at: IsoDateValue;
      user_id: string;
    }>(
      `
        select
          user_id,
          razorpay_customer_id,
          updated_at
        from billing_customers
        where user_id = $1
      `,
      [userId],
    );

    return result.rows[0] ? mapBillingCustomerRecord(result.rows[0]) : null;
  }

  async findUserIdByRazorpayCustomerId(
    razorpayCustomerId: string,
  ): Promise<string | null> {
    const result = await this.database.query<{ user_id: string }>(
      `
        select user_id
        from billing_customers
        where razorpay_customer_id = $1
      `,
      [razorpayCustomerId],
    );

    return result.rows[0]?.user_id ?? null;
  }

  async upsert(
    userId: string,
    razorpayCustomerId: string,
  ): Promise<BillingCustomerRecord> {
    const result = await this.database.query<{
      razorpay_customer_id: string;
      updated_at: IsoDateValue;
      user_id: string;
    }>(
      `
        insert into billing_customers (
          user_id,
          razorpay_customer_id
        )
        values ($1, $2)
        on conflict (user_id)
        do update set
          razorpay_customer_id = excluded.razorpay_customer_id,
          updated_at = now()
        returning
          user_id,
          razorpay_customer_id,
          updated_at
      `,
      [userId, razorpayCustomerId],
    );

    return mapBillingCustomerRecord(
      getRequiredRow(
        result.rows[0],
        "Billing customer upsert returned no row.",
      ),
    );
  }
}

export class UserSubscriptionRepository {
  constructor(private readonly database: PostgresDatabase) {}

  async findCurrentByUserId(
    userId: string,
  ): Promise<UserSubscriptionRecord | null> {
    const result = await this.database.query<{
      cancel_at_period_end: boolean;
      current_period_end: IsoDateValue;
      current_period_start: IsoDateValue;
      plan_tier: PlanTier;
      razorpay_plan_id: string | null;
      razorpay_subscription_id: string | null;
      status: SubscriptionStatus;
      updated_at: IsoDateValue;
    }>(
      `
        select
          razorpay_subscription_id,
          razorpay_plan_id,
          plan_tier,
          status,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          updated_at
        from user_subscriptions
        where user_id = $1
        order by
          case
            when status in ('authenticated', 'active') then 0
            when status = 'pending' then 1
            else 2
          end,
          updated_at desc
        limit 1
      `,
      [userId],
    );

    return result.rows[0] ? mapSubscriptionRecord(result.rows[0]) : null;
  }

  async findByRazorpaySubscriptionId(
    razorpaySubscriptionId: string,
  ): Promise<UserSubscriptionRecord | null> {
    const result = await this.database.query<{
      cancel_at_period_end: boolean;
      current_period_end: IsoDateValue;
      current_period_start: IsoDateValue;
      plan_tier: PlanTier;
      razorpay_plan_id: string | null;
      razorpay_subscription_id: string | null;
      status: SubscriptionStatus;
      updated_at: IsoDateValue;
    }>(
      `
        select
          razorpay_subscription_id,
          razorpay_plan_id,
          plan_tier,
          status,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          updated_at
        from user_subscriptions
        where razorpay_subscription_id = $1
        limit 1
      `,
      [razorpaySubscriptionId],
    );

    return result.rows[0] ? mapSubscriptionRecord(result.rows[0]) : null;
  }

  async findUserIdByRazorpaySubscriptionId(
    razorpaySubscriptionId: string,
  ): Promise<string | null> {
    const result = await this.database.query<{ user_id: string }>(
      `
        select user_id
        from user_subscriptions
        where razorpay_subscription_id = $1
        limit 1
      `,
      [razorpaySubscriptionId],
    );

    return result.rows[0]?.user_id ?? null;
  }

  async upsertFromRazorpay(input: {
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
    currentPeriodStart: Date | null;
    planTier: PlanTier;
    razorpayPlanId: string | null;
    razorpaySubscriptionId: string;
    status: SubscriptionStatus;
    userId: string;
  }): Promise<UserSubscriptionRecord> {
    const result = await this.database.query<{
      cancel_at_period_end: boolean;
      current_period_end: IsoDateValue;
      current_period_start: IsoDateValue;
      plan_tier: PlanTier;
      razorpay_plan_id: string | null;
      razorpay_subscription_id: string | null;
      status: SubscriptionStatus;
      updated_at: IsoDateValue;
    }>(
      `
        with upserted as (
          insert into user_subscriptions (
            user_id,
            razorpay_subscription_id,
            razorpay_plan_id,
            plan_tier,
            status,
            current_period_start,
            current_period_end,
            cancel_at_period_end
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8)
          on conflict (razorpay_subscription_id)
          do update set
            razorpay_plan_id = excluded.razorpay_plan_id,
            plan_tier = excluded.plan_tier,
            status = excluded.status,
            current_period_start = excluded.current_period_start,
            current_period_end = excluded.current_period_end,
            cancel_at_period_end = excluded.cancel_at_period_end,
            updated_at = now()
          where user_subscriptions.current_period_start is null
            or (
              excluded.current_period_start is not null
              and excluded.current_period_start >= user_subscriptions.current_period_start
            )
          returning
            razorpay_subscription_id,
            razorpay_plan_id,
            plan_tier,
            status,
            current_period_start,
            current_period_end,
            cancel_at_period_end,
            updated_at
        )
        select
          razorpay_subscription_id,
          razorpay_plan_id,
          plan_tier,
          status,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          updated_at
        from upserted
        union all
        select
          razorpay_subscription_id,
          razorpay_plan_id,
          plan_tier,
          status,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          updated_at
        from user_subscriptions
        where razorpay_subscription_id = $2
          and not exists (select 1 from upserted)
        limit 1
      `,
      [
        input.userId,
        input.razorpaySubscriptionId,
        input.razorpayPlanId,
        input.planTier,
        input.status,
        input.currentPeriodStart,
        input.currentPeriodEnd,
        input.cancelAtPeriodEnd,
      ],
    );

    return mapSubscriptionRecord(
      getRequiredRow(result.rows[0], "Subscription upsert returned no row."),
    );
  }
}

export class UsageEventRepository {
  constructor(private readonly database: PostgresDatabase) {}

  async countAiUsage(input: {
    periodEnd: Date | null;
    periodStart: Date;
    userId: string;
  }): Promise<number> {
    const result = await this.database.query<{ used: number }>(
      `
        select coalesce(sum(quantity), 0)::int as used
        from user_usage_events
        where user_id = $1
          and event_type = any($2::usage_event_type[])
          and created_at >= $3
          and ($4::timestamptz is null or created_at < $4)
      `,
      [
        input.userId,
        ["ai_hint", "ai_validation"],
        input.periodStart,
        input.periodEnd,
      ],
    );

    return result.rows[0]?.used ?? 0;
  }

  async record(input: {
    eventType: UsageEventType;
    metadata?: Record<string, unknown>;
    quantity?: number;
    userId: string;
  }): Promise<void> {
    await this.database.query(
      `
        insert into user_usage_events (
          user_id,
          event_type,
          quantity,
          metadata
        )
        values ($1, $2, $3, $4)
      `,
      [
        input.userId,
        input.eventType,
        input.quantity ?? 1,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }
}

export class OnboardingProfileRepository {
  constructor(private readonly database: PostgresDatabase) {}

  async findByUserId(userId: string): Promise<OnboardingProfileRecord | null> {
    const result = await this.database.query<{
      completed_at: IsoDateValue;
      experience_level: string | null;
      focus_areas: string[] | null;
      interview_timeline: string | null;
      target_role: string | null;
      updated_at: IsoDateValue;
    }>(
      `
        select
          target_role,
          experience_level,
          interview_timeline,
          focus_areas,
          completed_at,
          updated_at
        from user_onboarding_profiles
        where user_id = $1
      `,
      [userId],
    );

    return result.rows[0] ? mapOnboardingProfileRecord(result.rows[0]) : null;
  }

  async upsert(
    userId: string,
    input: OnboardingProfileInput,
  ): Promise<OnboardingProfileRecord> {
    const result = await this.database.query<{
      completed_at: IsoDateValue;
      experience_level: string | null;
      focus_areas: string[] | null;
      interview_timeline: string | null;
      target_role: string | null;
      updated_at: IsoDateValue;
    }>(
      `
        insert into user_onboarding_profiles (
          user_id,
          target_role,
          experience_level,
          interview_timeline,
          focus_areas,
          completed_at
        )
        values ($1, $2, $3, $4, $5, now())
        on conflict (user_id)
        do update set
          target_role = excluded.target_role,
          experience_level = excluded.experience_level,
          interview_timeline = excluded.interview_timeline,
          focus_areas = excluded.focus_areas,
          completed_at = coalesce(user_onboarding_profiles.completed_at, now()),
          updated_at = now()
        returning
          target_role,
          experience_level,
          interview_timeline,
          focus_areas,
          completed_at,
          updated_at
      `,
      [
        userId,
        input.targetRole ?? null,
        input.experienceLevel ?? null,
        input.interviewTimeline ?? null,
        input.focusAreas,
      ],
    );

    return mapOnboardingProfileRecord(
      getRequiredRow(
        result.rows[0],
        "Onboarding profile upsert returned no row.",
      ),
    );
  }
}

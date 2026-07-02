import type { AppConfig } from "../../config/env.js";
import {
  PaymentRequiredRequestError,
  TooManyRequestsError,
} from "../../shared/http/errors.js";
import type {
  BillingAccountRecord,
  BillingAccountRepository,
  BillingPlanSource,
  PlanTier,
  UsageEventRepository,
  UsageEventType,
  UserSubscriptionRecord,
  UserSubscriptionRepository,
} from "./billing.repository.js";

export interface BillingAccountState {
  entitlements: {
    advancedReview: boolean;
    aiFeedback: boolean;
    cloudSync: boolean;
    editorials: boolean;
    premiumCatalog: boolean;
  };
  plan: {
    isPaid: boolean;
    monthlyAiQuotaOverride: number | null;
    source: BillingPlanSource;
    tier: PlanTier;
  };
  subscription: UserSubscriptionRecord | null;
  usage: {
    monthlyAi: {
      limit: number;
      periodEnd: string | null;
      periodStart: string;
      remaining: number;
      used: number;
    };
  };
}

const PAID_ACTIVE_STATUSES = new Set(["authenticated", "active"]);
const FREE_STARTER_PROBLEM_IDS = new Set([
  "url-shortener",
  "pastebin",
  "rate-limiter",
  "autocomplete",
  "notification-service",
  "feature-flags",
  "session-store",
  "audit-log",
]);

interface AiUsagePeriod {
  end: Date | null;
  start: Date;
}

const getCalendarMonthUsagePeriod = (): AiUsagePeriod => {
  const now = new Date();

  return {
    end: null,
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
  };
};

const resolveActivePlanTier = (
  billingAccount: BillingAccountRecord,
  subscription: UserSubscriptionRecord | null,
): PlanTier => {
  if (billingAccount.planSource === "admin") {
    return billingAccount.planTier;
  }

  if (!subscription || !PAID_ACTIVE_STATUSES.has(subscription.status)) {
    return billingAccount.planTier;
  }

  return subscription.planTier;
};

const getMonthlyAiLimit = (
  config: AppConfig,
  billingAccount: BillingAccountRecord,
  tier: PlanTier,
): number => {
  return (
    billingAccount.monthlyAiQuotaOverride ?? config.usageQuotas.monthlyAi[tier]
  );
};

const parseOptionalDate = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const resolveAiUsagePeriod = (
  tier: PlanTier,
  subscription: UserSubscriptionRecord | null,
): AiUsagePeriod => {
  if (tier === "free") {
    return getCalendarMonthUsagePeriod();
  }

  const subscriptionPeriodStart = parseOptionalDate(
    subscription?.currentPeriodStart ?? null,
  );

  if (!subscriptionPeriodStart) {
    return getCalendarMonthUsagePeriod();
  }

  return {
    end: parseOptionalDate(subscription?.currentPeriodEnd ?? null),
    start: subscriptionPeriodStart,
  };
};

export class BillingAccessService {
  constructor(
    private readonly config: AppConfig,
    private readonly billingAccountRepository: BillingAccountRepository,
    private readonly subscriptionRepository: UserSubscriptionRepository,
    private readonly usageEventRepository: UsageEventRepository,
  ) {}

  async getAccountState(userId: string): Promise<BillingAccountState> {
    let billingAccount = await this.billingAccountRepository.ensureForUser(
      userId,
    );
    const subscription =
      await this.subscriptionRepository.findCurrentByUserId(userId);
    const hasActivePaidSubscription = Boolean(
      subscription &&
        subscription.planTier !== "free" &&
        PAID_ACTIVE_STATUSES.has(subscription.status),
    );

    if (
      subscription &&
      billingAccount.planSource !== "admin" &&
      ((hasActivePaidSubscription &&
        (billingAccount.planTier !== subscription.planTier ||
          billingAccount.planSource !== "subscription")) ||
        (!hasActivePaidSubscription &&
          billingAccount.planSource === "subscription"))
    ) {
      billingAccount =
        await this.billingAccountRepository.syncFromSubscription({
          planTier: subscription.planTier,
          status: subscription.status,
          userId,
        });
    }

    const tier = resolveActivePlanTier(billingAccount, subscription);
    const monthlyAiLimit = getMonthlyAiLimit(
      this.config,
      billingAccount,
      tier,
    );
    const aiUsagePeriod = resolveAiUsagePeriod(tier, subscription);
    const monthlyAiUsed = await this.usageEventRepository.countAiUsage({
      periodEnd: aiUsagePeriod.end,
      periodStart: aiUsagePeriod.start,
      userId,
    });
    const isPaid = tier !== "free";

    return {
      entitlements: {
        advancedReview: tier === "pro",
        aiFeedback: monthlyAiLimit > 0,
        cloudSync: isPaid,
        editorials: isPaid,
        premiumCatalog: isPaid,
      },
      plan: {
        isPaid,
        monthlyAiQuotaOverride: billingAccount.monthlyAiQuotaOverride,
        source: billingAccount.planSource,
        tier,
      },
      subscription,
      usage: {
        monthlyAi: {
          limit: monthlyAiLimit,
          periodEnd: aiUsagePeriod.end?.toISOString() ?? null,
          periodStart: aiUsagePeriod.start.toISOString(),
          remaining: Math.max(0, monthlyAiLimit - monthlyAiUsed),
          used: monthlyAiUsed,
        },
      },
    };
  }

  async assertCanUseCloudSync(userId: string): Promise<BillingAccountState> {
    const accountState = await this.getAccountState(userId);

    if (!accountState.entitlements.cloudSync) {
      throw new PaymentRequiredRequestError(
        "Upgrade to Plus or Pro to save progress and practice sessions to your account.",
      );
    }

    return accountState;
  }

  async assertCanReadEditorials(userId: string): Promise<BillingAccountState> {
    const accountState = await this.getAccountState(userId);

    if (!accountState.entitlements.editorials) {
      throw new PaymentRequiredRequestError(
        "Upgrade to Plus or Pro to read stage editorials.",
      );
    }

    return accountState;
  }

  async assertCanAccessProblem(input: {
    problemId: string;
    userId: string;
  }): Promise<BillingAccountState | null> {
    if (FREE_STARTER_PROBLEM_IDS.has(input.problemId)) {
      return null;
    }

    const accountState = await this.getAccountState(input.userId);

    if (!accountState.entitlements.premiumCatalog) {
      throw new PaymentRequiredRequestError(
        "Upgrade to Plus or Pro to access the full problem catalog.",
      );
    }

    return accountState;
  }

  async assertCanUseAi(userId: string): Promise<BillingAccountState> {
    const accountState = await this.getAccountState(userId);

    if (!accountState.entitlements.aiFeedback) {
      throw new PaymentRequiredRequestError(
        "Upgrade to Plus or Pro to enable AI feedback.",
      );
    }

    if (accountState.usage.monthlyAi.remaining <= 0) {
      throw new TooManyRequestsError(
        "Monthly AI feedback quota reached. Upgrade or wait for the quota reset.",
      );
    }

    return accountState;
  }

  async assertCanUseAdvancedReview(userId: string): Promise<BillingAccountState> {
    const accountState = await this.getAccountState(userId);

    if (!accountState.entitlements.advancedReview) {
      throw new PaymentRequiredRequestError(
        "Upgrade to Pro to review the full design across all stages.",
      );
    }

    if (!accountState.entitlements.aiFeedback) {
      throw new PaymentRequiredRequestError(
        "Upgrade to Pro to enable advanced AI review.",
      );
    }

    if (accountState.usage.monthlyAi.remaining <= 0) {
      throw new TooManyRequestsError(
        "Monthly AI feedback quota reached. Upgrade or wait for the quota reset.",
      );
    }

    return accountState;
  }

  async recordAiUsage(input: {
    eventType: UsageEventType;
    metadata?: Record<string, unknown>;
    userId: string;
  }): Promise<void> {
    await this.usageEventRepository.record({
      eventType: input.eventType,
      userId: input.userId,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    });
  }
}

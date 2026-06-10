import type { AppConfig } from "../../config/env.js";
import {
  PaymentRequiredRequestError,
  TooManyRequestsError,
} from "../../shared/http/errors.js";
import type {
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
    editorials: boolean;
    premiumCatalog: boolean;
  };
  plan: {
    isPaid: boolean;
    tier: PlanTier;
  };
  subscription: UserSubscriptionRecord | null;
  usage: {
    monthlyAi: {
      limit: number;
      remaining: number;
      used: number;
    };
  };
}

const PAID_ACTIVE_STATUSES = new Set(["authenticated", "active"]);

const getMonthStart = (): Date => {
  const now = new Date();

  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
};

const resolveActivePlanTier = (
  subscription: UserSubscriptionRecord | null,
): PlanTier => {
  if (!subscription || !PAID_ACTIVE_STATUSES.has(subscription.status)) {
    return "free";
  }

  return subscription.planTier;
};

const getMonthlyAiLimit = (config: AppConfig, tier: PlanTier): number => {
  return config.usageQuotas.monthlyAi[tier];
};

export class BillingAccessService {
  constructor(
    private readonly config: AppConfig,
    private readonly subscriptionRepository: UserSubscriptionRepository,
    private readonly usageEventRepository: UsageEventRepository,
  ) {}

  async getAccountState(userId: string): Promise<BillingAccountState> {
    const subscription =
      await this.subscriptionRepository.findCurrentByUserId(userId);
    const tier = resolveActivePlanTier(subscription);
    const monthlyAiLimit = getMonthlyAiLimit(this.config, tier);
    const monthlyAiUsed = await this.usageEventRepository.countMonthlyAiUsage(
      userId,
      getMonthStart(),
    );
    const isPaid = tier !== "free";

    return {
      entitlements: {
        advancedReview: tier === "pro",
        aiFeedback: monthlyAiLimit > 0,
        editorials: isPaid,
        premiumCatalog: isPaid,
      },
      plan: {
        isPaid,
        tier,
      },
      subscription,
      usage: {
        monthlyAi: {
          limit: monthlyAiLimit,
          remaining: Math.max(0, monthlyAiLimit - monthlyAiUsed),
          used: monthlyAiUsed,
        },
      },
    };
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

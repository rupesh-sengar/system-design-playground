import type { AppConfig } from "../../config/env.js";
import type { PlanTier } from "./billing.repository.js";

export type BillingInterval = "monthly" | "yearly";
export type PaidPlanTier = Exclude<PlanTier, "free">;

export interface BillingPlanPrice {
  amountMinor: number;
  checkoutAvailable: boolean;
  currency: "INR";
  interval: BillingInterval;
}

export interface BillingPlanCatalogItem {
  entitlements: {
    advancedReview: boolean;
    aiFeedback: boolean;
    cloudSync: boolean;
    editorials: boolean;
    premiumCatalog: boolean;
  };
  isPaid: boolean;
  label: string;
  prices: BillingPlanPrice[];
  rank: number;
  tier: PlanTier;
  usageQuotas: {
    monthlyAi: number;
  };
}

const PAID_PLAN_PRICES_MINOR: Record<
  PaidPlanTier,
  Record<BillingInterval, number>
> = {
  // Amounts are in paise and must match the configured Razorpay plan IDs.
  plus: {
    monthly: 19_900,
    yearly: 199_900,
  },
  pro: {
    monthly: 49_900,
    yearly: 499_900,
  },
};

const BILLING_INTERVALS = ["monthly", "yearly"] satisfies BillingInterval[];

const getPlanLabel = (tier: PlanTier): string => {
  if (tier === "plus") {
    return "Plus";
  }

  if (tier === "pro") {
    return "Pro";
  }

  return "Free";
};

const getPlanRank = (tier: PlanTier): number => {
  if (tier === "plus") {
    return 1;
  }

  if (tier === "pro") {
    return 2;
  }

  return 0;
};

const getPlanId = (
  config: AppConfig,
  tier: PaidPlanTier,
  interval: BillingInterval,
): string | null => {
  if (tier === "plus") {
    return interval === "monthly"
      ? config.razorpay.planIds.plusMonthly
      : config.razorpay.planIds.plusYearly;
  }

  return interval === "monthly"
    ? config.razorpay.planIds.proMonthly
    : config.razorpay.planIds.proYearly;
};

const createPrices = (
  config: AppConfig,
  tier: PlanTier,
): BillingPlanPrice[] => {
  if (tier === "free") {
    return [
      {
        amountMinor: 0,
        checkoutAvailable: false,
        currency: "INR",
        interval: "monthly",
      },
    ];
  }

  return BILLING_INTERVALS.map((interval) => ({
    amountMinor: PAID_PLAN_PRICES_MINOR[tier][interval],
    checkoutAvailable: Boolean(
      config.razorpay.isCheckoutEnabled && getPlanId(config, tier, interval),
    ),
    currency: "INR",
    interval,
  }));
};

const createEntitlements = (
  config: AppConfig,
  tier: PlanTier,
): BillingPlanCatalogItem["entitlements"] => {
  const isPaid = tier !== "free";

  return {
    advancedReview: tier === "pro",
    aiFeedback: config.usageQuotas.monthlyAi[tier] > 0,
    cloudSync: isPaid,
    editorials: isPaid,
    premiumCatalog: isPaid,
  };
};

export const getBillingPlanCatalog = (
  config: AppConfig,
): BillingPlanCatalogItem[] =>
  (["free", "plus", "pro"] satisfies PlanTier[]).map((tier) => ({
    entitlements: createEntitlements(config, tier),
    isPaid: tier !== "free",
    label: getPlanLabel(tier),
    prices: createPrices(config, tier),
    rank: getPlanRank(tier),
    tier,
    usageQuotas: {
      monthlyAi: config.usageQuotas.monthlyAi[tier],
    },
  }));

import { ArrowRight, Check, Minus } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppAuth } from "@/features/auth/app-auth";
import { getApiErrorMessage } from "@/shared/api/http";
import {
  type BillingInterval,
  type BillingPlan,
  type BillingPlanPrice,
  type PlanTier,
  useCreateCheckoutSessionMutation,
  useGetBillingAccountQuery,
  useGetBillingPlansQuery,
  useVerifyRazorpaySubscriptionMutation,
} from "../api/billingApi";
import "./PricingPage.css";

interface PricingPageProps {
  onOpenAccount: () => void;
  onOpenLibrary: () => void;
  onOpenOnboarding: () => void;
}

type PaidPlan = Exclude<PlanTier, "free">;

type ComparisonCellTone =
  | "available"
  | "highlight"
  | "limited"
  | "neutral"
  | "unavailable";

type ComparisonCell = {
  icon?: "check" | "minus";
  label: string;
  tone: ComparisonCellTone;
};

type ComparisonCells = Record<PlanTier, ComparisonCell>;

type ComparisonRow = {
  capability: string;
  cells: ComparisonCells;
};

const yes = (): ComparisonCell => ({
  icon: "check",
  label: "Yes",
  tone: "available",
});

const no = (): ComparisonCell => ({
  icon: "minus",
  label: "No",
  tone: "unavailable",
});

const value = (
  label: string,
  tone: ComparisonCellTone = "neutral",
): ComparisonCell => ({
  label,
  tone,
});

const RAZORPAY_CHECKOUT_SCRIPT_URL =
  "https://checkout.razorpay.com/v1/checkout.js";

let razorpayScriptPromise: Promise<void> | null = null;

const loadRazorpayCheckout = async (): Promise<void> => {
  if (window.Razorpay) {
    return;
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${RAZORPAY_CHECKOUT_SCRIPT_URL}"]`,
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), {
          once: true,
        });
        existingScript.addEventListener(
          "error",
          () => {
            razorpayScriptPromise = null;
            reject(new Error("Unable to load Razorpay Checkout."));
          },
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");

      script.async = true;
      script.src = RAZORPAY_CHECKOUT_SCRIPT_URL;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener(
        "error",
        () => {
          razorpayScriptPromise = null;
          reject(new Error("Unable to load Razorpay Checkout."));
        },
        { once: true },
      );
      document.body.appendChild(script);
    });
  }

  await razorpayScriptPromise;
};

const isPaidPlan = (tier: PlanTier): tier is PaidPlan => tier !== "free";

const createPlanCells = (
  getCell: (tier: PlanTier) => ComparisonCell,
): ComparisonCells => ({
  free: getCell("free"),
  plus: getCell("plus"),
  pro: getCell("pro"),
});

const findPlanPrice = (
  plan: BillingPlan | null,
  interval: BillingInterval,
): BillingPlanPrice | null =>
  plan?.prices.find((price) => price.interval === interval) ?? null;

const getPrimaryPlanPrice = (plan: BillingPlan): BillingPlanPrice | null =>
  findPlanPrice(plan, "monthly") ?? plan.prices[0] ?? null;

const getIntervalLabel = (interval: BillingInterval): string =>
  interval === "monthly" ? "month" : "year";

const formatMoney = (price: BillingPlanPrice): string =>
  new Intl.NumberFormat("en-IN", {
    currency: price.currency,
    currencyDisplay: "code",
    maximumFractionDigits: price.amountMinor % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(price.amountMinor / 100);

const formatPlanPrice = (price: BillingPlanPrice): string =>
  `${formatMoney(price)}/${getIntervalLabel(price.interval)}`;

const formatPrimaryPlanPrice = (plan: BillingPlan): string => {
  const price = getPrimaryPlanPrice(plan);

  return price ? formatPlanPrice(price) : "Unavailable";
};

const formatQuota = (quota: number): string =>
  `${quota.toLocaleString("en-IN")}/month`;

const buildComparisonRows = (
  plansByTier: Map<PlanTier, BillingPlan>,
): ComparisonRow[] => {
  const getPlan = (tier: PlanTier): BillingPlan | null =>
    plansByTier.get(tier) ?? null;
  const hasEntitlement = (
    tier: PlanTier,
    entitlement: keyof BillingPlan["entitlements"],
  ): boolean => Boolean(getPlan(tier)?.entitlements[entitlement]);
  const entitlementCells = (
    entitlement: keyof BillingPlan["entitlements"],
    unavailableCell: ComparisonCell = no(),
  ): ComparisonCells =>
    createPlanCells((tier) =>
      hasEntitlement(tier, entitlement) ? yes() : unavailableCell,
    );
  const monthlyAiCells = createPlanCells((tier) => {
    const quota = getPlan(tier)?.usageQuotas.monthlyAi ?? 0;

    if (quota <= 0) {
      return no();
    }

    return value(formatQuota(quota), tier === "free" ? "limited" : "highlight");
  });

  return [
    {
      capability: "Browse starter catalog",
      cells: createPlanCells(() => yes()),
    },
    {
      capability: "Full problem catalog",
      cells: entitlementCells("premiumCatalog", value("Limited", "limited")),
    },
    {
      capability: "Practice playground",
      cells: createPlanCells(() => yes()),
    },
    {
      capability: "Browser-local progress",
      cells: createPlanCells(() => yes()),
    },
    {
      capability: "Account-backed saved progress",
      cells: entitlementCells(
        "cloudSync",
        value("Browser storage only", "limited"),
      ),
    },
    {
      capability: "Saved practice sessions across devices",
      cells: entitlementCells("cloudSync"),
    },
    {
      capability: "AI hints/validation",
      cells: monthlyAiCells,
    },
    {
      capability: "Stage editorials",
      cells: entitlementCells("editorials"),
    },
    {
      capability: "Advanced AI review guidance",
      cells: entitlementCells("advancedReview"),
    },
    {
      capability: "Drawpad/diagram saving",
      cells: createPlanCells((tier) =>
        hasEntitlement(tier, "cloudSync")
          ? value("Account-backed", "available")
          : value("Local only", "limited"),
      ),
    },
    {
      capability: "Priority support",
      cells: {
        free: no(),
        plus: value("Standard", "neutral"),
        pro: value("Priority", "highlight"),
      },
    },
    {
      capability: "Early/beta features",
      cells: {
        free: no(),
        plus: value("Optional", "neutral"),
        pro: yes(),
      },
    },
  ];
};

const renderComparisonValue = (cell: ComparisonCell) => {
  const Icon =
    cell.icon === "check" ? Check : cell.icon === "minus" ? Minus : null;

  return (
    <span
      className={`pricing-comparison__value pricing-comparison__value--${cell.tone}`}
    >
      {Icon ? <Icon aria-hidden="true" size={15} strokeWidth={2.4} /> : null}
      <span>{cell.label}</span>
    </span>
  );
};

export const PricingPage = ({ onOpenAccount }: PricingPageProps) => {
  const [checkoutRuntimeError, setCheckoutRuntimeError] = useState<
    string | null
  >(null);
  const [selectedPaidPlan, setSelectedPaidPlan] = useState<PaidPlan | null>(
    null,
  );
  const { isApiAuthReady, isAuthenticated, isConfigured, isLoading, login } =
    useAppAuth();
  const {
    data: billingPlans = [],
    error: billingPlansError,
    isFetching: isBillingPlansFetching,
  } = useGetBillingPlansQuery();
  const {
    data: billingAccount,
    error: billingError,
    isFetching: isBillingFetching,
  } = useGetBillingAccountQuery(undefined, {
    skip: !isApiAuthReady,
  });
  const [createCheckoutSession, checkoutState] =
    useCreateCheckoutSessionMutation();
  const [verifyRazorpaySubscription, verifyState] =
    useVerifyRazorpaySubscriptionMutation();
  const activePlanTier =
    billingAccount?.plan.tier ?? (isAuthenticated ? "free" : null);
  const currentPlanTier: PlanTier =
    activePlanTier === "plus" || activePlanTier === "pro"
      ? activePlanTier
      : "free";
  const planColumns = useMemo(
    () => [...billingPlans].sort((left, right) => left.rank - right.rank),
    [billingPlans],
  );
  const plansByTier = useMemo(
    () =>
      new Map<PlanTier, BillingPlan>(
        planColumns.map((plan) => [plan.tier, plan]),
      ),
    [planColumns],
  );
  const comparisonRows = useMemo(
    () => buildComparisonRows(plansByTier),
    [plansByTier],
  );
  const billingPlansErrorMessage = billingPlansError
    ? getApiErrorMessage(billingPlansError, "Unable to load billing plans.")
    : null;
  const billingErrorMessage = billingError
    ? getApiErrorMessage(billingError, "Unable to load billing account.")
    : null;
  const checkoutErrorMessage = checkoutState.error
    ? getApiErrorMessage(checkoutState.error, "Unable to start checkout.")
    : null;
  const verifyErrorMessage = verifyState.error
    ? getApiErrorMessage(verifyState.error, "Unable to verify payment.")
    : null;
  const monthlyAiUsage = billingAccount?.usage.monthlyAi ?? null;
  const monthlyAiUsageLeft = monthlyAiUsage
    ? Math.max(monthlyAiUsage.limit - monthlyAiUsage.used, 0)
    : 0;
  const monthlyAiUsagePercent =
    monthlyAiUsage && monthlyAiUsage.limit > 0
      ? Math.min(
          100,
          Math.round((monthlyAiUsage.used / monthlyAiUsage.limit) * 100),
        )
      : 0;
  const isCheckoutBusy =
    checkoutState.isLoading ||
    verifyState.isLoading ||
    isLoading ||
    isBillingFetching ||
    isBillingPlansFetching;
  const getPlanRank = (tier: PlanTier): number =>
    plansByTier.get(tier)?.rank ?? 0;
  const canUpgradeToPlan = (tier: PlanTier): boolean => {
    const plan = plansByTier.get(tier);

    return Boolean(
      plan?.isPaid &&
        isPaidPlan(tier) &&
        plan.rank > getPlanRank(currentPlanTier),
    );
  };
  const selectedUpgradeTier =
    selectedPaidPlan && canUpgradeToPlan(selectedPaidPlan)
      ? selectedPaidPlan
      : null;
  const selectedUpgradePlan = selectedUpgradeTier
    ? (plansByTier.get(selectedUpgradeTier) ?? null)
    : null;
  const selectedMonthlyPrice = findPlanPrice(selectedUpgradePlan, "monthly");
  const selectedYearlyPrice = findPlanPrice(selectedUpgradePlan, "yearly");
  const currentPlanLabel = plansByTier.get(currentPlanTier)?.label ?? "Free";

  const selectPlanColumn = (tier: PlanTier): void => {
    setSelectedPaidPlan(
      canUpgradeToPlan(tier) && isPaidPlan(tier) ? tier : null,
    );
  };

  const getPlanCellClassName = (tier: PlanTier): string =>
    [
      "pricing-comparison__plan-cell",
      currentPlanTier === tier ? "pricing-comparison__plan-cell--current" : "",
      selectedUpgradeTier === tier
        ? "pricing-comparison__plan-cell--selected"
        : "",
      canUpgradeToPlan(tier) ? "pricing-comparison__plan-cell--selectable" : "",
    ]
      .filter(Boolean)
      .join(" ");

  const startCheckout = async (
    plan: PaidPlan,
    interval: BillingInterval,
  ): Promise<void> => {
    setCheckoutRuntimeError(null);

    if (!isConfigured || !isAuthenticated) {
      await login({
        intent: "signup",
        returnToHash: "#/pricing",
      });
      return;
    }

    if (!isApiAuthReady) {
      return;
    }

    try {
      const response = await createCheckoutSession({
        interval,
        plan,
        returnPath: "#/pricing",
      }).unwrap();

      await loadRazorpayCheckout();

      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout is unavailable.");
      }

      const checkout = new window.Razorpay({
        ...response.data.checkout,
        handler: (paymentResponse) => {
          void (async () => {
            try {
              await verifyRazorpaySubscription({
                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                razorpaySignature: paymentResponse.razorpay_signature,
                razorpaySubscriptionId:
                  paymentResponse.razorpay_subscription_id,
              }).unwrap();
              onOpenAccount();
            } catch (error) {
              setCheckoutRuntimeError(
                getApiErrorMessage(error, "Unable to verify payment."),
              );
            }
          })();
        },
      });

      checkout.on("payment.failed", (paymentFailure) => {
        setCheckoutRuntimeError(
          paymentFailure.error?.description ?? "Payment failed.",
        );
      });
      checkout.open();
    } catch (error) {
      setCheckoutRuntimeError(
        error instanceof Error ? error.message : "Unable to start checkout.",
      );
    }
  };

  return (
    <main className="pricing-page">
      {billingPlansErrorMessage ? (
        <div className="pricing-notice pricing-notice--error">
          {billingPlansErrorMessage}
        </div>
      ) : null}
      {billingErrorMessage ? (
        <div className="pricing-notice pricing-notice--error">
          {billingErrorMessage}
        </div>
      ) : null}
      {checkoutErrorMessage ? (
        <div className="pricing-notice pricing-notice--error">
          {checkoutErrorMessage}
        </div>
      ) : null}
      {verifyErrorMessage ? (
        <div className="pricing-notice pricing-notice--error">
          {verifyErrorMessage}
        </div>
      ) : null}
      {checkoutRuntimeError ? (
        <div className="pricing-notice pricing-notice--error">
          {checkoutRuntimeError}
        </div>
      ) : null}

      <section
        aria-labelledby="pricing-comparison-title"
        className="pricing-comparison"
      >
        <div className="pricing-comparison__head">
          {monthlyAiUsage ? (
            <div className="pricing-comparison__usage" aria-live="polite">
              <div className="pricing-comparison__usage-topline">
                <span>AI usage</span>
                <strong>
                  {monthlyAiUsage.used.toLocaleString("en-IN")}/
                  {monthlyAiUsage.limit.toLocaleString("en-IN")}
                </strong>
              </div>
              <div
                aria-label={`${monthlyAiUsagePercent}% of monthly AI quota used`}
                aria-valuemax={monthlyAiUsage.limit || 1}
                aria-valuemin={0}
                aria-valuenow={Math.min(
                  monthlyAiUsage.used,
                  monthlyAiUsage.limit || 1,
                )}
                className="pricing-comparison__usage-meter"
                role="meter"
              >
                <span style={{ width: `${monthlyAiUsagePercent}%` }} />
              </div>
              <p>
                {monthlyAiUsageLeft.toLocaleString("en-IN")} actions left this
                month on {currentPlanLabel}
              </p>
            </div>
          ) : null}

          {selectedUpgradePlan ? (
            <div className="pricing-comparison__upgrade" aria-live="polite">
              <div>
                <span>Selected upgrade</span>
                <strong>{selectedUpgradePlan.label}</strong>
                <p>
                  {selectedMonthlyPrice
                    ? formatPlanPrice(selectedMonthlyPrice)
                    : "Monthly unavailable"}{" "}
                  -{" "}
                  {selectedYearlyPrice
                    ? formatPlanPrice(selectedYearlyPrice)
                    : "Yearly unavailable"}
                </p>
              </div>
              <div className="pricing-comparison__upgrade-actions">
                <button
                  className="primary-action pricing-comparison__action"
                  disabled={
                    isCheckoutBusy || !selectedYearlyPrice?.checkoutAvailable
                  }
                  type="button"
                  onClick={() => {
                    if (selectedUpgradeTier && selectedYearlyPrice) {
                      void startCheckout(selectedUpgradeTier, "yearly");
                    }
                  }}
                >
                  Upgrade yearly
                  <ArrowRight aria-hidden="true" size={16} strokeWidth={2} />
                </button>
                <button
                  className="secondary-action pricing-comparison__action"
                  disabled={
                    isCheckoutBusy || !selectedMonthlyPrice?.checkoutAvailable
                  }
                  type="button"
                  onClick={() => {
                    if (selectedUpgradeTier && selectedMonthlyPrice) {
                      void startCheckout(selectedUpgradeTier, "monthly");
                    }
                  }}
                >
                  Monthly
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {planColumns.length > 0 ? (
          <div className="pricing-comparison__table-wrap">
            <table className="pricing-comparison__table">
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  {planColumns.map((plan) => {
                    const isCurrentPlan = currentPlanTier === plan.tier;
                    const isSelectable = canUpgradeToPlan(plan.tier);

                    return (
                      <th
                        className={getPlanCellClassName(plan.tier)}
                        key={plan.tier}
                        scope="col"
                      >
                        <button
                          aria-current={isCurrentPlan ? "true" : undefined}
                          aria-pressed={selectedUpgradeTier === plan.tier}
                          className="pricing-comparison__plan-button"
                          disabled={!isSelectable}
                          type="button"
                          onClick={() => selectPlanColumn(plan.tier)}
                        >
                          <span className="pricing-comparison__plan">
                            <strong>{plan.label}</strong>
                            <span>{formatPrimaryPlanPrice(plan)}</span>
                          </span>
                          {isCurrentPlan ? (
                            <span className="pricing-comparison__current-badge">
                              Current
                            </span>
                          ) : null}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.capability}>
                    <th scope="row">{row.capability}</th>
                    {planColumns.map((plan) => {
                      const isSelectable = canUpgradeToPlan(plan.tier);

                      return (
                        <td
                          className={getPlanCellClassName(plan.tier)}
                          key={plan.tier}
                          onClick={
                            isSelectable
                              ? () => selectPlanColumn(plan.tier)
                              : undefined
                          }
                        >
                          {renderComparisonValue(row.cells[plan.tier])}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="pricing-notice">
            {isBillingPlansFetching
              ? "Loading billing plans."
              : "Billing plans are unavailable."}
          </div>
        )}
      </section>
    </main>
  );
};

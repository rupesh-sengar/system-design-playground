import { ArrowRight, CreditCard, Gauge, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useAppAuth } from "@/features/auth/app-auth";
import { getApiErrorMessage } from "@/shared/api/http";
import { useGetBillingAccountQuery } from "../api/billingApi";
import "./AccountBillingPage.css";

interface AccountBillingPageProps {
  onOpenOnboarding: () => void;
  onOpenPricing: () => void;
}

const formatDate = (value: string | null): string => {
  if (!value) {
    return "Not scheduled";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Not scheduled";
  }

  return parsed.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatPlanLabel = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

export const AccountBillingPage = ({
  onOpenOnboarding,
  onOpenPricing,
}: AccountBillingPageProps) => {
  const {
    canRequestApiToken,
    isApiAuthReady,
    isAuthenticated,
    isConfigured,
    isLoading,
    login,
  } = useAppAuth();
  const {
    data: billingAccount,
    error: billingError,
    isFetching,
  } = useGetBillingAccountQuery(undefined, {
    skip: !isApiAuthReady,
  });
  const usage = billingAccount?.usage.monthlyAi;
  const usagePercent = useMemo(() => {
    if (!usage || usage.limit === 0) {
      return 0;
    }

    return Math.min(100, Math.round((usage.used / usage.limit) * 100));
  }, [usage]);
  const billingErrorMessage = billingError
    ? getApiErrorMessage(billingError, "Unable to load billing account.")
    : null;
  const planTier = billingAccount?.plan.tier ?? "free";
  const subscription = billingAccount?.subscription;

  if (!isConfigured || !canRequestApiToken) {
    return (
      <main className="account-page">
        <section className="account-empty">
          <CreditCard aria-hidden="true" size={28} strokeWidth={1.8} />
          <h1>Account billing</h1>
          <p>Auth0 and API audience configuration are required for account billing.</p>
        </section>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="account-page">
        <section className="account-empty">
          <CreditCard aria-hidden="true" size={28} strokeWidth={1.8} />
          <h1>Account billing</h1>
          <p>Sign in to view plan state, usage, subscription period, and billing controls.</p>
          <button
            className="primary-action"
            disabled={isLoading}
            type="button"
            onClick={() =>
              void login({
                returnToHash: "#/account",
              })
            }
          >
            Sign in
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="account-page">
      <section className="account-head">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Billing and usage</h1>
          <p>Plan, entitlement, and quota state for the current user.</p>
        </div>
        <div className="account-head__actions">
          <button
            className="secondary-action"
            type="button"
            onClick={onOpenOnboarding}
          >
            Setup
          </button>
          <button className="primary-action" type="button" onClick={onOpenPricing}>
            Plans
            <ArrowRight aria-hidden="true" size={16} strokeWidth={2} />
          </button>
        </div>
      </section>

      {billingErrorMessage ? (
        <div className="account-notice account-notice--error">
          {billingErrorMessage}
        </div>
      ) : null}
      <section className="account-grid">
        <article className="account-panel">
          <div className="account-panel__icon">
            <ShieldCheck aria-hidden="true" size={20} strokeWidth={2} />
          </div>
          <span>Plan</span>
          <strong>{formatPlanLabel(planTier)}</strong>
          <p>
            {billingAccount?.plan.isPaid
              ? "Paid features are active for this account."
              : "Free tier limits are active for this account."}
          </p>
        </article>

        <article className="account-panel">
          <div className="account-panel__icon">
            <Gauge aria-hidden="true" size={20} strokeWidth={2} />
          </div>
          <span>Monthly AI usage</span>
          <strong>{usage ? `${usage.used}/${usage.limit}` : "Loading"}</strong>
          <div
            aria-label={`${usagePercent}% of monthly AI quota used`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={usagePercent}
            className="account-meter"
            role="meter"
          >
            <span style={{ width: `${usagePercent}%` }} />
          </div>
        </article>

        <article className="account-panel">
          <div className="account-panel__icon">
            <Sparkles aria-hidden="true" size={20} strokeWidth={2} />
          </div>
          <span>Subscription</span>
          <strong>{subscription?.status ?? "Free"}</strong>
          <p>
            Period ends:{" "}
            {formatDate(subscription?.currentPeriodEnd ?? null)}
          </p>
        </article>
      </section>

      <section className="account-actions">
        <div>
          <h2>Plan management</h2>
          <p>
            Plan changes and payment authorization are handled through Razorpay
            checkout.
          </p>
        </div>
        <button
          className="primary-action"
          disabled={isFetching}
          type="button"
          onClick={onOpenPricing}
        >
          View plans
          <ArrowRight aria-hidden="true" size={16} strokeWidth={2} />
        </button>
      </section>
    </main>
  );
};

import {
  ArrowRight,
  Check,
  CreditCard,
  Crown,
  Gauge,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAppAuth } from "@/features/auth/app-auth";
import { getApiErrorMessage } from "@/shared/api/http";
import {
  useCreateCheckoutSessionMutation,
  useGetBillingAccountQuery,
  useVerifyRazorpaySubscriptionMutation,
} from "../api/billingApi";
import "./PricingPage.css";

interface PricingPageProps {
  onOpenAccount: () => void;
  onOpenLibrary: () => void;
  onOpenOnboarding: () => void;
}

const proFeatures = [
  "Everything in Plus",
  "1000 AI hint or validation actions each month",
  "Higher quota for intensive interview preparation",
  "Advanced review guidance for repeated practice cycles",
];

const plusFeatures = [
  "Full system design problem catalog",
  "200 AI hint or validation actions each month",
  "Saved practice sessions across devices",
  "Stage editorials and structured review guidance",
];

const freeFeatures = [
  "Browse and practice starter problems",
  "10 AI hint or validation actions each month",
  "Local progress without account-backed history",
];

const RAZORPAY_CHECKOUT_SCRIPT_URL =
  "https://checkout.razorpay.com/v1/checkout.js";
const USD_INR_RATE = 95.631;

type PaidPlan = "plus" | "pro";

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

const formatPlanLabel = (tier: string | null): string => {
  if (!tier) {
    return "Guest";
  }

  return tier.charAt(0).toUpperCase() + tier.slice(1);
};

const formatUsdEquivalent = (inrAmount: number): string => {
  return `$${(inrAmount / USD_INR_RATE).toFixed(2)}`;
};

export const PricingPage = ({
  onOpenAccount,
  onOpenLibrary,
  onOpenOnboarding,
}: PricingPageProps) => {
  const [checkoutRuntimeError, setCheckoutRuntimeError] = useState<string | null>(
    null,
  );
  const {
    isApiAuthReady,
    isAuthenticated,
    isConfigured,
    isLoading,
    login,
  } = useAppAuth();
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
  const activePlanTier = billingAccount?.plan.tier ?? (isAuthenticated ? "free" : null);
  const billingErrorMessage = billingError
    ? getApiErrorMessage(billingError, "Unable to load billing account.")
    : null;
  const checkoutErrorMessage = checkoutState.error
    ? getApiErrorMessage(checkoutState.error, "Unable to start checkout.")
    : null;
  const verifyErrorMessage = verifyState.error
    ? getApiErrorMessage(verifyState.error, "Unable to verify payment.")
    : null;
  const monthlyAiUsage = billingAccount?.usage.monthlyAi;
  const usagePercent = useMemo(() => {
    if (!monthlyAiUsage || monthlyAiUsage.limit === 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round((monthlyAiUsage.used / monthlyAiUsage.limit) * 100),
    );
  }, [monthlyAiUsage]);

  const startCheckout = async (
    plan: PaidPlan,
    interval: "monthly" | "yearly",
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
      <section className="pricing-hero">
        <div className="pricing-hero__copy">
          <p className="eyebrow">Pricing</p>
          <h1>System Design Lab</h1>
          <p>
            Start with a usable free workspace, then upgrade when AI feedback,
            saved sessions, and deeper practice coverage become part of the
            routine.
          </p>
        </div>

        <div className="pricing-hero__summary">
          <span className="pricing-hero__icon">
            <CreditCard aria-hidden="true" size={20} strokeWidth={2} />
          </span>
          <span>Current plan</span>
          <strong>{formatPlanLabel(activePlanTier)}</strong>
          {monthlyAiUsage ? (
            <div className="pricing-usage">
              <div className="pricing-usage__topline">
                <span>AI usage</span>
                <strong>
                  {monthlyAiUsage.used}/{monthlyAiUsage.limit}
                </strong>
              </div>
              <div
                aria-label={`${usagePercent}% of monthly AI quota used`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={usagePercent}
                className="pricing-usage__meter"
                role="meter"
              >
                <span style={{ width: `${usagePercent}%` }} />
              </div>
            </div>
          ) : null}
        </div>
      </section>

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

      <section className="pricing-grid" aria-label="Plans">
        <article className="pricing-card">
          <div className="pricing-card__head">
            <span className="pricing-card__icon">
              <Gauge aria-hidden="true" size={19} strokeWidth={2} />
            </span>
            <div>
              <h2>Free</h2>
              <p>For trying the practice workflow.</p>
            </div>
          </div>
          <div className="pricing-card__price">
            <strong>INR 0</strong>
            <span>/ month</span>
          </div>
          <ul className="pricing-card__features">
            {freeFeatures.map((feature) => (
              <li key={feature}>
                <Check aria-hidden="true" size={15} strokeWidth={2} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <button
            className="secondary-action pricing-card__action"
            type="button"
            onClick={isAuthenticated ? onOpenLibrary : onOpenOnboarding}
          >
            {activePlanTier === "free" ? "Open workspace" : "Start free"}
          </button>
        </article>

        <article className="pricing-card pricing-card--featured">
          <div className="pricing-card__badge">Recommended</div>
          <div className="pricing-card__head">
            <span className="pricing-card__icon">
              <Sparkles aria-hidden="true" size={19} strokeWidth={2} />
            </span>
            <div>
              <h2>Plus</h2>
              <p>For active interview preparation.</p>
            </div>
          </div>
          <div className="pricing-card__price">
            <strong>INR 199</strong>
            <span>/ month</span>
          </div>
          <p className="pricing-card__subprice">
            {formatUsdEquivalent(199)} / month - INR 1,999 yearly (
            {formatUsdEquivalent(1999)})
          </p>
          <ul className="pricing-card__features">
            {plusFeatures.map((feature) => (
              <li key={feature}>
                <Check aria-hidden="true" size={15} strokeWidth={2} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="pricing-card__actions">
            <button
              className="primary-action pricing-card__action"
              disabled={
                checkoutState.isLoading ||
                verifyState.isLoading ||
                isLoading ||
                isBillingFetching
              }
              type="button"
              onClick={() => void startCheckout("plus", "yearly")}
            >
              Plus yearly
              <ArrowRight aria-hidden="true" size={16} strokeWidth={2} />
            </button>
            <button
              className="secondary-action pricing-card__action"
              disabled={
                checkoutState.isLoading ||
                verifyState.isLoading ||
                isLoading ||
                isBillingFetching
              }
              type="button"
              onClick={() => void startCheckout("plus", "monthly")}
            >
              Monthly
            </button>
          </div>
        </article>

        <article className="pricing-card">
          <div className="pricing-card__head">
            <span className="pricing-card__icon">
              <Crown aria-hidden="true" size={19} strokeWidth={2} />
            </span>
            <div>
              <h2>Pro</h2>
              <p>For high-volume preparation.</p>
            </div>
          </div>
          <div className="pricing-card__price">
            <strong>INR 499</strong>
            <span>/ month</span>
          </div>
          <p className="pricing-card__subprice">
            {formatUsdEquivalent(499)} / month - INR 4,999 yearly (
            {formatUsdEquivalent(4999)})
          </p>
          <ul className="pricing-card__features">
            {proFeatures.map((feature) => (
              <li key={feature}>
                <Check aria-hidden="true" size={15} strokeWidth={2} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="pricing-card__actions">
            <button
              className="primary-action pricing-card__action"
              disabled={
                checkoutState.isLoading ||
                verifyState.isLoading ||
                isLoading ||
                isBillingFetching
              }
              type="button"
              onClick={() => void startCheckout("pro", "yearly")}
            >
              Pro yearly
              <ArrowRight aria-hidden="true" size={16} strokeWidth={2} />
            </button>
            <button
              className="secondary-action pricing-card__action"
              disabled={
                checkoutState.isLoading ||
                verifyState.isLoading ||
                isLoading ||
                isBillingFetching
              }
              type="button"
              onClick={() => void startCheckout("pro", "monthly")}
            >
              Monthly
            </button>
          </div>
        </article>
      </section>

    </main>
  );
};

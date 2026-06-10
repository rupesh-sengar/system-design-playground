import { baseApi } from "@/shared/api/baseApi";
import { getApiErrorDetails, requestJson } from "@/shared/api/http";

export type PlanTier = "free" | "plus" | "pro";

export interface BillingAccount {
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
  subscription: {
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    currentPeriodStart: string | null;
    planTier: PlanTier;
    razorpayPlanId: string | null;
    razorpaySubscriptionId: string | null;
    status: string;
    updatedAt: string;
  } | null;
  usage: {
    monthlyAi: {
      limit: number;
      remaining: number;
      used: number;
    };
  };
}

type BillingAccountEnvelope = {
  data: BillingAccount;
};

type UrlEnvelope = {
  data: {
    url: string;
  };
};

export interface RazorpayCheckoutOptions {
  description: string;
  key: string;
  name: string;
  notes: Record<string, string>;
  prefill: {
    email?: string;
    name?: string;
  };
  subscription_id: string;
  theme: {
    color: string;
  };
}

type CheckoutEnvelope = {
  data: {
    checkout: RazorpayCheckoutOptions;
  };
};

type RtkQueryCustomError = {
  error: string;
  data: {
    error: string;
    kind: ReturnType<typeof getApiErrorDetails>["kind"];
    retryable: boolean;
    statusCode: number | null;
  };
  status: "CUSTOM_ERROR";
};

const toQueryError = (
  error: unknown,
  fallbackMessage: string,
): RtkQueryCustomError => {
  const details = getApiErrorDetails(error, fallbackMessage);

  return {
    error: details.message,
    data: {
      error: details.message,
      kind: details.kind,
      retryable: details.retryable,
      statusCode: details.statusCode,
    },
    status: "CUSTOM_ERROR",
  };
};

export const billingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createBillingPortalSession: builder.mutation<
      UrlEnvelope,
      {
        returnPath?: string;
      }
    >({
      queryFn: async (body) => {
        try {
          const response = await requestJson<UrlEnvelope>(
            "/v1/billing/customer-portal",
            {
              body: JSON.stringify(body),
              method: "POST",
              requiresAuth: true,
            },
          );

          return { data: response };
        } catch (error) {
          return {
            error: toQueryError(error, "Unable to open billing portal."),
          };
        }
      },
    }),
    createCheckoutSession: builder.mutation<
      CheckoutEnvelope,
      {
        interval: "monthly" | "yearly";
        plan: "plus" | "pro";
        returnPath?: string;
      }
    >({
      queryFn: async (body) => {
        try {
          const response = await requestJson<CheckoutEnvelope>(
            "/v1/billing/checkout-session",
            {
              body: JSON.stringify(body),
              method: "POST",
              requiresAuth: true,
            },
          );

          return { data: response };
        } catch (error) {
          return {
            error: toQueryError(error, "Unable to start checkout."),
          };
        }
      },
    }),
    verifyRazorpaySubscription: builder.mutation<
      BillingAccountEnvelope,
      {
        razorpayPaymentId: string;
        razorpaySignature: string;
        razorpaySubscriptionId: string;
      }
    >({
      invalidatesTags: ["BillingAccount"],
      queryFn: async (body) => {
        try {
          const response = await requestJson<BillingAccountEnvelope>(
            "/v1/billing/verify-subscription",
            {
              body: JSON.stringify(body),
              method: "POST",
              requiresAuth: true,
            },
          );

          return { data: response };
        } catch (error) {
          return {
            error: toQueryError(error, "Unable to verify payment."),
          };
        }
      },
    }),
    getBillingAccount: builder.query<BillingAccount, void>({
      providesTags: ["BillingAccount"],
      queryFn: async () => {
        try {
          const response = await requestJson<BillingAccountEnvelope>(
            "/v1/billing/me",
            {
              requiresAuth: true,
            },
          );

          return { data: response.data };
        } catch (error) {
          return {
            error: toQueryError(error, "Unable to load billing account."),
          };
        }
      },
    }),
  }),
});

export const {
  useCreateBillingPortalSessionMutation,
  useCreateCheckoutSessionMutation,
  useGetBillingAccountQuery,
  useVerifyRazorpaySubscriptionMutation,
} = billingApi;

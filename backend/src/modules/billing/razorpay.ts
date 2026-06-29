import { createHmac, timingSafeEqual } from "node:crypto";
import type { AppConfig } from "../../config/env.js";
import {
  BadRequestError,
  ServiceUnavailableError,
} from "../../shared/http/errors.js";
import type {
  BillingAccountRepository,
  BillingCustomerRepository,
  PlanTier,
  SubscriptionStatus,
  UserSubscriptionRepository,
} from "./billing.repository.js";

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

export interface RazorpaySubscriptionResponse {
  current_end?: number | null;
  current_start?: number | null;
  customer_id?: string | null;
  id: string;
  notes?: unknown;
  plan_id?: string | null;
  short_url?: string | null;
  status?: string | null;
}

interface RazorpayWebhookEvent {
  event?: unknown;
  payload?: {
    subscription?: {
      entity?: unknown;
    };
  };
}

interface RazorpaySubscriptionObject {
  current_end?: unknown;
  current_start?: unknown;
  customer_id?: unknown;
  id?: unknown;
  notes?: unknown;
  plan_id?: unknown;
  status?: unknown;
}

const allowedSubscriptionStatuses = new Set<SubscriptionStatus>([
  "created",
  "authenticated",
  "active",
  "pending",
  "halted",
  "cancelled",
  "completed",
  "expired",
  "paused",
  "resumed",
]);

const readString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const readRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const readUnixTimestamp = (value: unknown): Date | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return new Date(value * 1000);
};

const safeCompareHex = (
  candidateSignature: string,
  expectedSignature: string,
): boolean => {
  try {
    const candidateBuffer = Buffer.from(candidateSignature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    return (
      candidateBuffer.length === expectedBuffer.length &&
      timingSafeEqual(candidateBuffer, expectedBuffer)
    );
  } catch {
    return false;
  }
};

const mapSubscriptionStatus = (value: unknown): SubscriptionStatus => {
  const rawStatus = readString(value);
  const normalizedStatus = rawStatus === "canceled" ? "cancelled" : rawStatus;

  return normalizedStatus &&
    allowedSubscriptionStatuses.has(normalizedStatus as SubscriptionStatus)
    ? (normalizedStatus as SubscriptionStatus)
    : "created";
};

const readAppUserIdFromNotes = (notes: unknown): string | null => {
  return readString(readRecord(notes)?.app_user_id);
};

const readErrorMessage = (payload: unknown, fallback: string): string => {
  const error = readRecord(readRecord(payload)?.error);

  return (
    readString(error?.description) ??
    readString(error?.reason) ??
    readString(error?.message) ??
    fallback
  );
};

const toSubscriptionObject = (
  subscription: RazorpaySubscriptionResponse | unknown,
): RazorpaySubscriptionObject => subscription as RazorpaySubscriptionObject;

export class RazorpayBillingClient {
  constructor(private readonly config: AppConfig) {}

  private getKeyId(): string {
    const keyId = this.config.razorpay.keyId;

    if (!keyId) {
      throw new ServiceUnavailableError("Razorpay key id is not configured.");
    }

    return keyId;
  }

  private getKeySecret(): string {
    const keySecret = this.config.razorpay.keySecret;

    if (!keySecret) {
      throw new ServiceUnavailableError("Razorpay key secret is not configured.");
    }

    return keySecret;
  }

  private getAuthorizationHeader(): string {
    return `Basic ${Buffer.from(
      `${this.getKeyId()}:${this.getKeySecret()}`,
      "utf8",
    ).toString("base64")}`;
  }

  private async requestJson<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const headers = new Headers(init.headers);

    headers.set("Authorization", this.getAuthorizationHeader());

    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${this.config.razorpay.apiBaseUrl}${path}`, {
      ...init,
      headers,
    });
    const payload = await response
      .json()
      .catch(() => null) as unknown;

    if (!response.ok) {
      throw new ServiceUnavailableError(
        readErrorMessage(payload, "Razorpay request failed."),
      );
    }

    return payload as T;
  }

  async createSubscription(input: {
    displayName: string | null;
    email: string | null;
    interval: "monthly" | "yearly";
    plan: "plus" | "pro";
    planId: string;
    userId: string;
  }): Promise<RazorpaySubscriptionResponse> {
    const notes: Record<string, string> = {
      app_plan_interval: input.interval,
      app_plan_tier: input.plan,
      app_user_id: input.userId,
    };

    if (input.displayName) {
      notes.app_user_name = input.displayName;
    }

    if (input.email) {
      notes.app_user_email = input.email;
    }

    return this.requestJson<RazorpaySubscriptionResponse>(
      "/v1/subscriptions",
      {
        body: JSON.stringify({
          customer_notify: true,
          notes,
          plan_id: input.planId,
          quantity: 1,
          total_count: input.interval === "monthly" ? 1200 : 100,
        }),
        method: "POST",
      },
    );
  }

  async fetchSubscription(
    subscriptionId: string,
  ): Promise<RazorpaySubscriptionResponse> {
    return this.requestJson<RazorpaySubscriptionResponse>(
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
      {
        method: "GET",
      },
    );
  }

  buildCheckoutOptions(input: {
    description: string;
    displayName: string | null;
    email: string | null;
    subscriptionId: string;
    userId: string;
  }): RazorpayCheckoutOptions {
    return {
      description: input.description,
      key: this.getKeyId(),
      name: "System Design Park",
      notes: {
        app_user_id: input.userId,
      },
      prefill: {
        ...(input.displayName ? { name: input.displayName } : {}),
        ...(input.email ? { email: input.email } : {}),
      },
      subscription_id: input.subscriptionId,
      theme: {
        color: "#14b8a6",
      },
    };
  }

  verifySubscriptionSignature(input: {
    razorpayPaymentId: string;
    razorpaySignature: string;
    razorpaySubscriptionId: string;
  }): boolean {
    const expectedSignature = createHmac("sha256", this.getKeySecret())
      .update(`${input.razorpayPaymentId}|${input.razorpaySubscriptionId}`)
      .digest("hex");

    return safeCompareHex(input.razorpaySignature, expectedSignature);
  }
}

export class RazorpayWebhookVerifier {
  constructor(private readonly config: AppConfig) {}

  constructEvent(rawBody: Buffer, signatureHeader: string | undefined): unknown {
    const webhookSecret = this.config.razorpay.webhookSecret;

    if (!webhookSecret) {
      throw new ServiceUnavailableError(
        "Razorpay webhook secret is not configured.",
      );
    }

    if (!signatureHeader) {
      throw new BadRequestError("Missing Razorpay signature header.");
    }

    const expectedSignature = createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (!safeCompareHex(signatureHeader, expectedSignature)) {
      throw new BadRequestError(
        "Razorpay webhook signature verification failed.",
      );
    }

    return JSON.parse(rawBody.toString("utf8")) as unknown;
  }
}

export class RazorpayWebhookService {
  constructor(
    private readonly config: AppConfig,
    private readonly billingAccountRepository: BillingAccountRepository,
    private readonly billingCustomerRepository: BillingCustomerRepository,
    private readonly subscriptionRepository: UserSubscriptionRepository,
  ) {}

  async handleEvent(rawEvent: unknown): Promise<void> {
    const event = rawEvent as RazorpayWebhookEvent;
    const eventName = readString(event.event);

    if (!eventName?.startsWith("subscription.")) {
      return;
    }

    await this.handleSubscriptionChange(event.payload?.subscription?.entity);
  }

  async syncSubscriptionForUser(
    userId: string,
    rawSubscription: RazorpaySubscriptionResponse | unknown,
  ): Promise<void> {
    const subscription = toSubscriptionObject(rawSubscription);
    const razorpaySubscriptionId = readString(subscription.id);

    if (!razorpaySubscriptionId) {
      throw new BadRequestError("Razorpay subscription id is missing.");
    }

    const razorpayCustomerId = readString(subscription.customer_id);

    if (razorpayCustomerId) {
      await this.billingCustomerRepository.upsert(userId, razorpayCustomerId);
    }

    const razorpayPlanId = readString(subscription.plan_id);

    const subscriptionRecord = await this.subscriptionRepository.upsertFromRazorpay({
      cancelAtPeriodEnd: false,
      currentPeriodEnd: readUnixTimestamp(subscription.current_end),
      currentPeriodStart: readUnixTimestamp(subscription.current_start),
      planTier: this.resolvePlanTier(razorpayPlanId),
      razorpayPlanId,
      razorpaySubscriptionId,
      status: mapSubscriptionStatus(subscription.status),
      userId,
    });

    await this.billingAccountRepository.syncFromSubscription({
      planTier: subscriptionRecord.planTier,
      status: subscriptionRecord.status,
      userId,
    });
  }

  private resolvePlanTier(planId: string | null): PlanTier {
    if (
      planId === this.config.razorpay.planIds.proMonthly ||
      planId === this.config.razorpay.planIds.proYearly
    ) {
      return "pro";
    }

    return "plus";
  }

  private async handleSubscriptionChange(rawSubscription: unknown): Promise<void> {
    const subscription = toSubscriptionObject(rawSubscription);
    const razorpayCustomerId = readString(subscription.customer_id);
    const razorpaySubscriptionId = readString(subscription.id);

    if (!razorpaySubscriptionId) {
      return;
    }

    const userId =
      readAppUserIdFromNotes(subscription.notes) ??
      (await this.subscriptionRepository.findUserIdByRazorpaySubscriptionId(
        razorpaySubscriptionId,
      )) ??
      (razorpayCustomerId
        ? await this.billingCustomerRepository.findUserIdByRazorpayCustomerId(
            razorpayCustomerId,
          )
        : null);

    if (!userId) {
      return;
    }

    await this.syncSubscriptionForUser(userId, subscription);
  }
}

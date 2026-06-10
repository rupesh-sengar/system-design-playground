import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import type { AppConfig } from "../../config/env.js";
import {
  BadRequestError,
  ServiceUnavailableError,
} from "../../shared/http/errors.js";
import { requireCurrentAppUser } from "../persistence/current-app-user.middleware.js";
import type { UserSubscriptionRepository } from "./billing.repository.js";
import {
  billingPortalSessionSchema,
  checkoutSessionSchema,
  razorpaySubscriptionVerificationSchema,
} from "./contracts.js";
import type { BillingAccessService } from "./entitlements.js";
import type {
  RazorpayBillingClient,
  RazorpayWebhookService,
  RazorpayWebhookVerifier,
} from "./razorpay.js";

interface CreateBillingRouterOptions {
  billingAccessService: BillingAccessService;
  config: AppConfig;
  razorpayClient: RazorpayBillingClient;
  razorpayWebhookService: RazorpayWebhookService;
  userSubscriptionRepository: UserSubscriptionRepository;
}

interface CreateRazorpayWebhookRouterOptions {
  razorpayWebhookService: RazorpayWebhookService;
  razorpayWebhookVerifier: RazorpayWebhookVerifier;
}

const createAsyncHandler =
  (
    handler: (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => Promise<void>,
  ) =>
  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };

const resolveCheckoutPlanId = (
  config: AppConfig,
  plan: "plus" | "pro",
  interval: "monthly" | "yearly",
): string => {
  const planId =
    plan === "plus"
      ? interval === "monthly"
        ? config.razorpay.planIds.plusMonthly
        : config.razorpay.planIds.plusYearly
      : interval === "monthly"
        ? config.razorpay.planIds.proMonthly
        : config.razorpay.planIds.proYearly;

  if (!planId) {
    throw new ServiceUnavailableError(
      "The requested Razorpay plan is not configured.",
    );
  }

  if (!planId.startsWith("plan_")) {
    throw new ServiceUnavailableError(
      `RAZORPAY_PLAN_${plan.toUpperCase()}_${interval.toUpperCase()} must be a Razorpay plan id beginning with plan_.`,
    );
  }

  return planId;
};

const getCheckoutDescription = (
  plan: "plus" | "pro",
  interval: "monthly" | "yearly",
): string => {
  const planLabel = plan === "plus" ? "Plus" : "Pro";

  return `System Design Lab ${planLabel} ${interval} subscription`;
};

export const createBillingRouter = ({
  billingAccessService,
  config,
  razorpayClient,
  razorpayWebhookService,
  userSubscriptionRepository,
}: CreateBillingRouterOptions): Router => {
  const router = Router();

  router.get(
    "/me",
    createAsyncHandler(async (request, response) => {
      const appUser = requireCurrentAppUser(request);
      const accountState = await billingAccessService.getAccountState(
        appUser.id,
      );

      response.json({
        data: accountState,
      });
    }),
  );

  router.post(
    "/checkout-session",
    createAsyncHandler(async (request, response) => {
      const appUser = requireCurrentAppUser(request);
      const input = checkoutSessionSchema.parse(request.body);

      if (!config.razorpay.isCheckoutEnabled) {
        throw new ServiceUnavailableError(
          "Razorpay checkout is not configured for this environment.",
        );
      }

      const subscription = await razorpayClient.createSubscription({
        displayName: appUser.displayName,
        email: appUser.email,
        interval: input.interval,
        plan: input.plan,
        planId: resolveCheckoutPlanId(config, input.plan, input.interval),
        userId: appUser.id,
      });

      await razorpayWebhookService.syncSubscriptionForUser(
        appUser.id,
        subscription,
      );

      response.json({
        data: {
          checkout: razorpayClient.buildCheckoutOptions({
            description: getCheckoutDescription(input.plan, input.interval),
            displayName: appUser.displayName,
            email: appUser.email,
            subscriptionId: subscription.id,
            userId: appUser.id,
          }),
        },
      });
    }),
  );

  router.post(
    "/verify-subscription",
    createAsyncHandler(async (request, response) => {
      const appUser = requireCurrentAppUser(request);
      const input = razorpaySubscriptionVerificationSchema.parse(request.body);
      const subscriptionUserId =
        await userSubscriptionRepository.findUserIdByRazorpaySubscriptionId(
          input.razorpaySubscriptionId,
        );

      if (subscriptionUserId !== appUser.id) {
        throw new BadRequestError(
          "Razorpay subscription does not belong to this account.",
        );
      }

      const hasValidSignature = razorpayClient.verifySubscriptionSignature({
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature,
        razorpaySubscriptionId: input.razorpaySubscriptionId,
      });

      if (!hasValidSignature) {
        throw new BadRequestError(
          "Razorpay subscription signature verification failed.",
        );
      }

      const subscription = await razorpayClient.fetchSubscription(
        input.razorpaySubscriptionId,
      );

      await razorpayWebhookService.syncSubscriptionForUser(
        appUser.id,
        subscription,
      );

      response.json({
        data: await billingAccessService.getAccountState(appUser.id),
      });
    }),
  );

  router.post(
    "/customer-portal",
    createAsyncHandler(async (request, _response) => {
      billingPortalSessionSchema.parse(request.body);

      throw new ServiceUnavailableError(
        "Razorpay customer portal is not available for this integration.",
      );
    }),
  );

  return router;
};

export const createRazorpayWebhookRouter = ({
  razorpayWebhookService,
  razorpayWebhookVerifier,
}: CreateRazorpayWebhookRouterOptions): Router => {
  const router = Router();

  router.post(
    "/",
    createAsyncHandler(async (request, response) => {
      const rawBody = Buffer.isBuffer(request.body)
        ? request.body
        : Buffer.from("");
      const event = razorpayWebhookVerifier.constructEvent(
        rawBody,
        request.header("x-razorpay-signature"),
      );

      await razorpayWebhookService.handleEvent(event);

      response.json({
        received: true,
      });
    }),
  );

  return router;
};

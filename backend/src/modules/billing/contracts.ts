import { z } from "zod";

export const checkoutSessionSchema = z.object({
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
  plan: z.enum(["plus", "pro"]).default("plus"),
  returnPath: z.string().max(240).optional(),
});

export const billingPortalSessionSchema = z.object({
  returnPath: z.string().max(240).optional(),
});

export const razorpaySubscriptionVerificationSchema = z.object({
  razorpayPaymentId: z.string().trim().min(1).max(120),
  razorpaySignature: z.string().trim().min(1).max(240),
  razorpaySubscriptionId: z.string().trim().min(1).max(120),
});

export const onboardingProfileSchema = z.object({
  experienceLevel: z.string().trim().max(80).nullable().optional(),
  focusAreas: z.array(z.string().trim().min(1).max(80)).max(8).default([]),
  interviewTimeline: z.string().trim().max(80).nullable().optional(),
  targetRole: z.string().trim().max(120).nullable().optional(),
});

export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;
export type BillingPortalSessionInput = z.infer<
  typeof billingPortalSessionSchema
>;
export type RazorpaySubscriptionVerificationInput = z.infer<
  typeof razorpaySubscriptionVerificationSchema
>;
export type OnboardingProfileInput = z.infer<typeof onboardingProfileSchema>;

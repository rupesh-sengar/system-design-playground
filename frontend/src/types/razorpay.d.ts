import type { RazorpayCheckoutOptions } from "@/features/billing/api/billingApi";

declare global {
  interface RazorpayPaymentResponse {
    razorpay_payment_id: string;
    razorpay_signature: string;
    razorpay_subscription_id: string;
  }

  interface RazorpayCheckoutInstance {
    on(
      eventName: "payment.failed",
      handler: (response: { error?: { description?: string } }) => void,
    ): void;
    open(): void;
  }

  interface Window {
    Razorpay?: new (
      options: RazorpayCheckoutOptions & {
        handler: (response: RazorpayPaymentResponse) => void;
      },
    ) => RazorpayCheckoutInstance;
  }
}

export {};

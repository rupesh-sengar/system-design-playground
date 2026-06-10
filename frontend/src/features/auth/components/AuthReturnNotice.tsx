import { useEffect } from "react";
import { ArrowRight, MailCheck } from "lucide-react";
import { useAppAuth } from "../app-auth";
import "./auth-return-notice.css";

const isEmailVerificationNotice = (message: string): boolean => {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("verify") ||
    normalizedMessage.includes("verification") ||
    normalizedMessage.includes("email")
  );
};

const cleanAuthCallbackQuery = (): void => {
  const searchParams = new URLSearchParams(window.location.search);

  if (!searchParams.has("error") && !searchParams.has("error_description")) {
    return;
  }

  const nextUrl = `${window.location.pathname}${window.location.hash || "#/"}`;

  window.history.replaceState({}, document.title, nextUrl);
};

export const AuthReturnNotice = () => {
  const { authError, isAuthenticated, isConfigured, isLoading, login } =
    useAppAuth();

  useEffect(() => {
    if (authError) {
      cleanAuthCallbackQuery();
    }
  }, [authError]);

  if (!authError || isAuthenticated) {
    return null;
  }

  const isVerificationNotice = isEmailVerificationNotice(authError);
  const title = isVerificationNotice
    ? "Check your email to finish signup"
    : "Sign-in did not complete";
  const copy = isVerificationNotice
    ? "A verification link is required before this account can sign in. After verifying your email, return here and continue."
    : authError;

  return (
    <section
      className={`auth-return-notice ${
        isVerificationNotice ? "auth-return-notice--verification" : ""
      }`}
      role="status"
    >
      <span className="auth-return-notice__icon">
        <MailCheck aria-hidden="true" size={18} strokeWidth={2} />
      </span>
      <div className="auth-return-notice__copy">
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
      {isConfigured ? (
        <button
          className="primary-action auth-return-notice__action"
          disabled={isLoading}
          type="button"
          onClick={() =>
            void login({
              returnToHash: window.location.hash || "#/",
            })
          }
        >
          Sign in again
          <ArrowRight aria-hidden="true" size={15} strokeWidth={2} />
        </button>
      ) : null}
    </section>
  );
};

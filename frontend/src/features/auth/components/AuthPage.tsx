import { type FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LogIn,
  Mail,
  UserPlus,
} from "lucide-react";
import { useAppAuth } from "../app-auth";
import type { AuthMode } from "@/app/router";
import "@/shared/ui/shared-ui.css";
import "./auth-page.css";

interface AuthPageProps {
  mode: AuthMode;
  onContinue: () => void;
  onModeChange: (mode: AuthMode) => void;
}

const modeContent: Record<
  AuthMode,
  {
    actionLabel: string;
    eyebrow: string;
    icon: typeof LogIn;
    title: string;
  }
> = {
  login: {
    actionLabel: "Continue with Auth0",
    eyebrow: "Welcome back",
    icon: LogIn,
    title: "Sign in to System Design Lab",
  },
  signup: {
    actionLabel: "Create account",
    eyebrow: "Start practicing",
    icon: UserPlus,
    title: "Create your System Design Lab account",
  },
  "reset-password": {
    actionLabel: "Send reset email",
    eyebrow: "Account recovery",
    icon: KeyRound,
    title: "Reset your password",
  },
};

export const AuthPage = ({ mode, onContinue, onModeChange }: AuthPageProps) => {
  const {
    authError,
    isAuthenticated,
    isConfigured,
    isLoading,
    login,
    requestPasswordReset,
    userEmail,
    userName,
  } = useAppAuth();
  const [email, setEmail] = useState(userEmail ?? "");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const content = modeContent[mode];
  const Icon = content.icon;
  const trimmedEmail = email.trim();
  const canSubmit =
    isConfigured &&
    !isLoading &&
    !isSubmitting &&
    (mode === "reset-password" ? Boolean(trimmedEmail) : true);
  const signedInLabel = useMemo(
    () => userName ?? userEmail ?? "Signed in",
    [userEmail, userName],
  );

  const handleModeChange = (nextMode: AuthMode): void => {
    setStatusMessage(null);
    setErrorMessage(null);
    onModeChange(nextMode);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    if (!isConfigured) {
      setErrorMessage("Auth0 is not configured for this environment.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "reset-password") {
        const message = await requestPasswordReset(trimmedEmail);
        setStatusMessage(
          message ||
            "If an account exists for that email, Auth0 will send reset instructions.",
        );
        return;
      }

      await login({
        intent: mode,
        loginHint: trimmedEmail || undefined,
        method: "popup",
        returnToHash: "#/",
      });
      onContinue();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to continue with Auth0.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated) {
    return (
      <main className="auth-page">
        <section className="auth-panel auth-panel--center">
          <span className="auth-panel__icon">
            <CheckCircle2 aria-hidden="true" size={20} strokeWidth={2} />
          </span>
          <p className="eyebrow">Authenticated</p>
          <h1>{signedInLabel}</h1>
          <p className="auth-panel__copy">
            Your account is connected and practice progress can sync to your
            profile.
          </p>
          <button className="primary-action" type="button" onClick={onContinue}>
            Continue
            <ArrowRight aria-hidden="true" size={16} strokeWidth={2} />
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-panel__head">
          <span className="auth-panel__icon">
            <Icon aria-hidden="true" size={20} strokeWidth={2} />
          </span>
          <div>
            <p className="eyebrow">{content.eyebrow}</p>
            <h1>{content.title}</h1>
          </div>
        </div>

        <div className="auth-mode-switch" aria-label="Authentication mode">
          <button
            aria-pressed={mode === "login"}
            className={mode === "login" ? "auth-mode-switch__button--active" : ""}
            type="button"
            onClick={() => handleModeChange("login")}
          >
            Sign in
          </button>
          <button
            aria-pressed={mode === "signup"}
            className={mode === "signup" ? "auth-mode-switch__button--active" : ""}
            type="button"
            onClick={() => handleModeChange("signup")}
          >
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <div className="auth-field__control">
              <Mail aria-hidden="true" size={16} strokeWidth={2} />
              <input
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </label>

          <button
            className="primary-action auth-submit"
            disabled={!canSubmit}
            type="submit"
          >
            {isSubmitting || isLoading ? "Continuing..." : content.actionLabel}
            <ArrowRight aria-hidden="true" size={16} strokeWidth={2} />
          </button>
        </form>

        {mode !== "reset-password" ? (
          <button
            className="auth-link"
            type="button"
            onClick={() => handleModeChange("reset-password")}
          >
            Forgot password?
          </button>
        ) : (
          <button
            className="auth-link"
            type="button"
            onClick={() => handleModeChange("login")}
          >
            Back to sign in
          </button>
        )}

        {statusMessage ? (
          <p className="auth-message auth-message--success">{statusMessage}</p>
        ) : null}

        {errorMessage || authError ? (
          <p className="auth-message auth-message--error">
            {errorMessage ?? authError}
          </p>
        ) : null}
      </section>
    </main>
  );
};

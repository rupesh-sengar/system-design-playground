import {
  BookOpenCheck,
  CircleUserRound,
  LogIn,
  LogOut,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { frontendConfig } from "@/config/env";
import { useGetBillingAccountQuery } from "@/features/billing/api/billingApi";
import { useAppAuth } from "../app-auth";
import { useBackendHealth } from "../hooks/useBackendHealth";
import "./auth-session-control.css";

interface AuthSessionControlProps {
  onOpenAccount?: () => void;
  onOpenGuide?: () => void;
  showGuestSignupPrompt?: boolean;
}

const GUEST_SIGNUP_PROMPT_DISMISSED_KEY =
  "system-design-lab.guest-signup-prompt.dismissed.v1";

const hasDismissedGuestSignupPrompt = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.sessionStorage.getItem(GUEST_SIGNUP_PROMPT_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
};

const buildInitials = (value: string | null): string => {
  if (!value) {
    return "SD";
  }

  const tokens = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return "SD";
  }

  return tokens
    .map((token) => token.charAt(0).toUpperCase())
    .join("");
};

const getBackendStatusTone = (
  status: "idle" | "connecting" | "connected" | "reconnecting" | "disconnected",
): "connected" | "checking" | "reconnecting" | "disconnected" => {
  if (status === "connected") {
    return "connected";
  }

  if (status === "reconnecting") {
    return "reconnecting";
  }

  if (status === "disconnected") {
    return "disconnected";
  }

  return "checking";
};

const formatPlanLabel = (value: string | null): string => {
  if (!value) {
    return "Guest";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
};

const isEmailVerificationNotice = (message: string | null): boolean => {
  if (!message) {
    return false;
  }

  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("verify") ||
    normalizedMessage.includes("verification") ||
    normalizedMessage.includes("email")
  );
};

export const AuthSessionControl = ({
  onOpenAccount,
  onOpenGuide,
  showGuestSignupPrompt = false,
}: AuthSessionControlProps) => {
  const {
    authError,
    canRequestApiToken,
    isApiAuthReady,
    isAuthenticated,
    isConfigured,
    isLoading,
    login,
    logout,
    userEmail,
    userName,
    userPicture,
  } = useAppAuth();
  const {
    errorMessage,
    providerLabel,
    retryCount,
    status,
  } = useBackendHealth(isAuthenticated);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [
    isGuestSignupPromptDismissed,
    setIsGuestSignupPromptDismissed,
  ] = useState(hasDismissedGuestSignupPrompt);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const {
    data: billingAccount,
    error: billingError,
    isFetching: isBillingFetching,
  } = useGetBillingAccountQuery(undefined, {
    skip: !frontendConfig.features.billing || !isApiAuthReady || !isMenuOpen,
  });
  const displayName = userName ?? userEmail ?? "Signed in";
  const pendingDisplayName = userName ?? userEmail ?? "Pending account";
  const initials = useMemo(
    () => buildInitials(userName ?? userEmail),
    [userEmail, userName],
  );
  const accountTypeLabel = !frontendConfig.features.billing
    ? "Account"
    : isBillingFetching
      ? "Loading"
      : billingError
        ? "Unavailable"
        : formatPlanLabel(billingAccount?.plan.tier ?? "free");
  const backendStatusTone = getBackendStatusTone(status);
  const backendStatusLabel =
    backendStatusTone === "connected"
      ? "Backend connected"
      : backendStatusTone === "reconnecting"
        ? "Reconnecting"
        : backendStatusTone === "disconnected"
          ? "Disconnected"
          : "Checking";
  const backendStatusDetail =
    backendStatusTone === "connected"
      ? providerLabel
        ? `Healthy via ${providerLabel}.`
        : "Backend health checks are passing."
      : backendStatusTone === "reconnecting"
        ? `${errorMessage ?? "Backend is temporarily unreachable."} Retry ${retryCount} of 5.`
      : backendStatusTone === "disconnected"
        ? `${errorMessage ?? "Backend is unreachable."} Health checks paused after ${retryCount} failed attempts.`
          : "Running the initial backend health check.";
  const authNotice = authError
    ? authError
    : !canRequestApiToken
      ? "Protected API tokens are disabled until the Auth0 audience is configured."
      : null;
  const isEmailVerificationPending = isEmailVerificationNotice(authError);
  const shouldShowGuestSignupPrompt =
    showGuestSignupPrompt && !isGuestSignupPromptDismissed;

  const dismissGuestSignupPrompt = (): void => {
    setIsGuestSignupPromptDismissed(true);

    try {
      window.sessionStorage.setItem(GUEST_SIGNUP_PROMPT_DISMISSED_KEY, "true");
    } catch {
      // The prompt can still hide for this render if session storage is unavailable.
    }
  };

  useEffect(() => {
    if (!isAuthenticated && !isEmailVerificationPending) {
      setIsMenuOpen(false);
    }
  }, [isAuthenticated, isEmailVerificationPending]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  if (!isConfigured) {
    return (
      <div className="session-nav">
        <span className="session-nav__notice session-nav__notice--warning">
          Auth unavailable
        </span>
      </div>
    );
  }

  if (!isAuthenticated && isEmailVerificationPending) {
    return (
      <div ref={rootRef} className="session-nav">
        <button
          aria-expanded={isMenuOpen}
          aria-haspopup="dialog"
          aria-label="Open pending verification menu"
          className="session-nav__trigger"
          title="Email verification pending"
          type="button"
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <span className="session-nav__avatar">
            {userPicture ? (
              <img
                alt=""
                className="session-nav__avatar-image"
                src={userPicture}
              />
            ) : (
              buildInitials(userName ?? userEmail ?? "Pending account")
            )}
          </span>
          <span
            className="session-nav__status-dot session-nav__status-dot--pending"
            title="Email verification pending"
          />
        </button>

        {isMenuOpen ? (
          <div
            className="session-nav__menu"
            role="dialog"
            aria-label="Pending verification menu"
          >
            <section className="session-nav__profile-summary">
              <span className="session-nav__profile-avatar">
                {userPicture ? (
                  <img
                    alt=""
                    className="session-nav__avatar-image"
                    src={userPicture}
                  />
                ) : (
                  buildInitials(userName ?? userEmail ?? "Pending account")
                )}
              </span>
              <span className="session-nav__profile-copy">
                <span className="session-nav__menu-label">Verification pending</span>
                <strong>{pendingDisplayName}</strong>
                {userEmail && userEmail !== pendingDisplayName ? (
                  <span>{userEmail}</span>
                ) : null}
                <span className="session-nav__account-line">
                  Status <b>Email not verified</b>
                </span>
              </span>
            </section>

            <p className="session-nav__menu-note session-nav__menu-note--warning">
              Verify your email before continuing, or sign out to use another
              account.
            </p>

            <button
              className="session-nav__menu-action session-nav__menu-action--danger"
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                logout();
              }}
            >
              <LogOut aria-hidden="true" size={16} strokeWidth={2} />
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="session-nav session-nav--guest">
        <div className="session-nav__auth-actions">
          <button
            className="session-nav__signin"
            disabled={isLoading}
            type="button"
            onClick={() => {
              void login();
            }}
          >
            <LogIn aria-hidden="true" size={15} strokeWidth={2} />
            {isLoading ? "Loading..." : "Sign in"}
          </button>
          <button
            className="session-nav__signin session-nav__signin--signup"
            disabled={isLoading}
            type="button"
            onClick={() => {
              dismissGuestSignupPrompt();
              void login({ intent: "signup" });
            }}
          >
            <UserPlus aria-hidden="true" size={15} strokeWidth={2} />
            {isLoading ? "Loading..." : "Sign up"}
          </button>
        </div>

        {shouldShowGuestSignupPrompt ? (
          <aside
            className="session-nav__signup-popout"
            aria-label="Signup invitation"
          >
            <span className="session-nav__signup-popout-title">
              New here?
            </span>
            <button
              aria-label="Dismiss signup invitation"
              className="session-nav__signup-popout-close"
              type="button"
              onClick={dismissGuestSignupPrompt}
            >
              <X aria-hidden="true" size={14} strokeWidth={2} />
            </button>
            <span className="session-nav__signup-popout-copy">
              Create a free account to save progress and keep your practice
              history.
            </span>
          </aside>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="session-nav">
      <button
        aria-expanded={isMenuOpen}
        aria-haspopup="dialog"
        aria-label="Open profile menu"
        className="session-nav__trigger"
        title={`${backendStatusLabel}. ${backendStatusDetail}`}
        type="button"
        onClick={() => setIsMenuOpen((current) => !current)}
      >
        <span className="session-nav__avatar">{initials}</span>
        <span
          className={`session-nav__status-dot session-nav__status-dot--${backendStatusTone}`}
          title={`${backendStatusLabel}. ${backendStatusDetail}`}
        />
      </button>

      {isMenuOpen ? (
        <div className="session-nav__menu" role="dialog" aria-label="Profile menu">
          <section className="session-nav__menu-section">
            <span className="session-nav__menu-label">Profile</span>
            <strong>{displayName}</strong>
            {userEmail && userEmail !== displayName ? <span>{userEmail}</span> : null}
            <span className="session-nav__account-type">{accountTypeLabel}</span>
          </section>

          {authNotice ? (
            <p
              className={`session-nav__menu-note ${
                authError
                  ? "session-nav__menu-note--error"
                  : "session-nav__menu-note--warning"
              }`}
            >
              {authNotice}
            </p>
          ) : null}

          <div className="session-nav__menu-divider" />

          <div className="session-nav__menu-actions">
            {onOpenAccount ? (
              <button
                className="session-nav__menu-action"
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenAccount();
                }}
              >
                <CircleUserRound aria-hidden="true" size={16} strokeWidth={2} />
                Account
              </button>
            ) : null}
            {onOpenGuide ? (
              <button
                className="session-nav__menu-action"
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenGuide();
                }}
              >
                <BookOpenCheck aria-hidden="true" size={16} strokeWidth={2} />
                Guide
              </button>
            ) : null}
          </div>

          <button
            className="session-nav__menu-action session-nav__menu-action--danger"
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              logout();
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
};

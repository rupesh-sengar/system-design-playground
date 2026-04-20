import { useEffect, useMemo, useRef, useState } from "react";
import { useAppAuth } from "../app-auth";
import { useBackendHealth } from "../hooks/useBackendHealth";

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

export const AuthSessionControl = () => {
  const {
    authError,
    canRequestApiToken,
    isAuthenticated,
    isConfigured,
    isLoading,
    login,
    logout,
    userEmail,
    userName,
  } = useAppAuth();
  const {
    errorMessage,
    hasRetryLimitReached,
    providerLabel,
    retryCount,
    status,
  } = useBackendHealth(isAuthenticated);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const displayName = userName ?? userEmail ?? "Signed in";
  const initials = useMemo(
    () => buildInitials(userName ?? userEmail),
    [userEmail, userName],
  );
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

  useEffect(() => {
    if (!isAuthenticated) {
      setIsMenuOpen(false);
    }
  }, [isAuthenticated]);

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

  if (!isAuthenticated) {
    return (
      <div className="session-nav session-nav--guest">
        <button
          className="session-nav__signin"
          disabled={isLoading}
          type="button"
          onClick={() => {
            void login();
          }}
        >
          {isLoading ? "Loading..." : "Sign in"}
        </button>

        {authError ? (
          <span className="session-nav__notice session-nav__notice--error">
            {authError}
          </span>
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
        title={backendStatusLabel}
        type="button"
        onClick={() => setIsMenuOpen((current) => !current)}
      >
        <span className="session-nav__avatar">{initials}</span>
        <span
          className={`session-nav__status-dot session-nav__status-dot--${backendStatusTone}`}
        />
      </button>

      {isMenuOpen ? (
        <div className="session-nav__menu" role="dialog" aria-label="Profile menu">
          <section className="session-nav__menu-section">
            <span className="session-nav__menu-label">Profile</span>
            <strong>{displayName}</strong>
            {userEmail && userEmail !== displayName ? <span>{userEmail}</span> : null}
          </section>

          <section className="session-nav__menu-section session-nav__menu-section--status">
            <div
              className={`session-nav__connection session-nav__connection--${backendStatusTone}`}
            >
              <span className="session-nav__connection-dot" />
              {backendStatusLabel}
            </div>
            <p>{backendStatusDetail}</p>

            {authNotice ? (
              <p
                className={`session-nav__menu-note ${
                  hasRetryLimitReached || authError
                    ? "session-nav__menu-note--error"
                    : "session-nav__menu-note--warning"
                }`}
              >
                {authNotice}
              </p>
            ) : null}
          </section>

          <div className="session-nav__menu-divider" />

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

import { useAppAuth } from "../app-auth";

const buildInitials = (value: string | null): string => {
  if (!value) {
    return "AI";
  }

  const parts = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "AI";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
};

export const AuthSessionControl = () => {
  const {
    authError,
    canRequestApiToken,
    config,
    isAuthenticated,
    isConfigured,
    isLoading,
    login,
    logout,
    userEmail,
    userName,
  } = useAppAuth();

  if (!isConfigured) {
    return (
      <section className="session-control session-control--warning">
        <div className="session-control__copy">
          <strong>Auth unavailable</strong>
          <span>Add Auth0 env vars to enable protected API calls.</span>
        </div>
      </section>
    );
  }

  if (!canRequestApiToken) {
    return (
      <section className="session-control session-control--warning">
        <div className="session-control__copy">
          <strong>API audience missing</strong>
          <span>{config.domain}</span>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="session-control">
        <div className="session-control__copy">
          <strong>Secure AI review</strong>
          <span>
            Sign in once and the app will attach the Auth0 token automatically.
          </span>
          {authError ? (
            <span className="session-control__error">{authError}</span>
          ) : null}
        </div>

        <button
          className="primary-action"
          type="button"
          disabled={isLoading}
          onClick={() => void login()}
        >
          {isLoading ? "Checking session..." : "Sign in"}
        </button>
      </section>
    );
  }

  return (
    <section className="session-control session-control--active">
      <div className="session-control__identity">
        <span className="session-control__avatar">
          {buildInitials(userName ?? userEmail)}
        </span>
        <div className="session-control__copy">
          <strong>{userName ?? userEmail ?? "Authenticated user"}</strong>
          <span>Protected API enabled</span>
          {authError ? (
            <span className="session-control__error">{authError}</span>
          ) : null}
        </div>
      </div>

      <button className="secondary-action" type="button" onClick={logout}>
        Sign out
      </button>
    </section>
  );
};

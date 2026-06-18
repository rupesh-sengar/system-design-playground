import { Auth0Provider, useAuth0, type AppState } from "@auth0/auth0-react";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { requestJson, setApiAccessTokenResolver } from "@/shared/api/http";
import {
  buildAuth0EndpointUrl,
  buildAuth0AuthorizationParams,
  getAuth0Config,
  type Auth0Config,
} from "./config";

export type AuthIntent = "login" | "signup";

interface AuthRedirectOptions {
  intent?: AuthIntent;
  loginHint?: string;
  method?: "popup" | "redirect";
  returnToHash?: string;
}

interface AppAuthContextValue {
  authError: string | null;
  canRequestApiToken: boolean;
  config: Auth0Config;
  isApiAuthReady: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  login: (options?: AuthRedirectOptions) => Promise<void>;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<string>;
  userEmail: string | null;
  userName: string | null;
  userPicture: string | null;
}

type RedirectAppState = AppState & {
  returnToHash?: string;
};

const auth0Config = getAuth0Config();

const unauthenticatedContextValue: AppAuthContextValue = {
  authError: null,
  canRequestApiToken: false,
  config: auth0Config,
  isApiAuthReady: false,
  isAuthenticated: false,
  isConfigured: auth0Config.isConfigured,
  isLoading: false,
  login: async () => undefined,
  logout: () => undefined,
  requestPasswordReset: async () => "",
  userEmail: null,
  userName: null,
  userPicture: null,
};

const AppAuthContext = createContext<AppAuthContextValue>(
  unauthenticatedContextValue,
);

const getStringProperty = (
  value: unknown,
  propertyName: string,
): string | null => {
  if (typeof value !== "object" || value === null || !(propertyName in value)) {
    return null;
  }

  const propertyValue = (value as Record<string, unknown>)[propertyName];

  return typeof propertyValue === "string" ? propertyValue : null;
};

const isInvalidAuthStateError = (error: unknown): boolean => {
  const errorCode =
    getStringProperty(error, "error") ??
    getStringProperty(error, "code") ??
    getStringProperty(error, "name");
  const errorMessage =
    error instanceof Error
      ? error.message
      : (getStringProperty(error, "message") ??
        getStringProperty(error, "error_description"));
  const normalizedCode = errorCode?.toLowerCase().replace(/[\s-]+/g, "_");
  const normalizedMessage = errorMessage?.toLowerCase();

  return (
    normalizedCode === "invalid_state" ||
    normalizedMessage === "invalid state" ||
    normalizedMessage?.includes("invalid state") === true
  );
};

const formatAuthError = (error: unknown, fallbackMessage: string): string => {
  if (isInvalidAuthStateError(error)) {
    return "Verify your email, then sign in again.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
};

const getAuth0ApiErrorMessage = (
  responseBody: string,
  fallbackMessage: string,
): string => {
  if (!responseBody) {
    return fallbackMessage;
  }

  try {
    const parsedBody = JSON.parse(responseBody) as {
      error?: unknown;
      error_description?: unknown;
      message?: unknown;
    };
    const message =
      typeof parsedBody.error_description === "string"
        ? parsedBody.error_description
        : typeof parsedBody.message === "string"
          ? parsedBody.message
          : typeof parsedBody.error === "string"
            ? parsedBody.error
            : null;

    return message ?? fallbackMessage;
  } catch {
    return responseBody;
  }
};

const Auth0Bridge = ({ children }: PropsWithChildren) => {
  const {
    error,
    getAccessTokenSilently,
    isAuthenticated,
    isLoading,
    loginWithPopup,
    loginWithRedirect,
    logout,
    user,
  } = useAuth0();
  const [isApiTokenResolverReady, setIsApiTokenResolverReady] = useState(false);
  const getAccessTokenSilentlyRef = useRef(getAccessTokenSilently);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const isLoadingRef = useRef(isLoading);
  const lastProfileSyncSignatureRef = useRef<string | null>(null);

  getAccessTokenSilentlyRef.current = getAccessTokenSilently;
  isAuthenticatedRef.current = isAuthenticated;
  isLoadingRef.current = isLoading;

  useEffect(() => {
    setApiAccessTokenResolver(async () => {
      if (!auth0Config.audience) {
        throw new Error(
          "Set VITE_AUTH0_AUDIENCE so the frontend can request an API JWT.",
        );
      }

      if (isLoadingRef.current) {
        throw new Error("Authentication is still initializing.");
      }

      if (!isAuthenticatedRef.current) {
        throw new Error("Login before using protected API routes.");
      }

      return getAccessTokenSilentlyRef.current({
        authorizationParams: buildAuth0AuthorizationParams(auth0Config),
      });
    });
    setIsApiTokenResolverReady(true);

    return () => {
      setApiAccessTokenResolver(null);
      setIsApiTokenResolverReady(false);
    };
  }, []);

  useEffect(() => {
    if (
      !auth0Config.isConfigured ||
      !auth0Config.audience ||
      !isAuthenticated ||
      isLoading ||
      !isApiTokenResolverReady ||
      !user
    ) {
      return;
    }

    const email = getStringProperty(user, "email");
    const name = getStringProperty(user, "name");
    const nickname = getStringProperty(user, "nickname");
    const preferredUsername = getStringProperty(user, "preferred_username");
    const picture = getStringProperty(user, "picture");
    const profile = {
      displayName: name ?? nickname ?? email,
      email,
      pictureUrl: picture,
      username: preferredUsername ?? nickname,
    };
    const profileSignature = JSON.stringify(profile);

    if (lastProfileSyncSignatureRef.current === profileSignature) {
      return;
    }

    lastProfileSyncSignatureRef.current = profileSignature;

    void requestJson<{ data: unknown }>("/v1/persistence/me/profile", {
      body: JSON.stringify(profile),
      method: "PUT",
      requiresAuth: true,
    }).catch(() => {
      lastProfileSyncSignatureRef.current = null;
    });
  }, [isAuthenticated, isApiTokenResolverReady, isLoading, user]);

  const contextValue = useMemo<AppAuthContextValue>(() => {
    const login = async (options?: AuthRedirectOptions): Promise<void> => {
      const loginHint = options?.loginHint?.trim();
      const authorizationParams = {
        ...buildAuth0AuthorizationParams(auth0Config),
        ...(options?.intent === "signup" ? { screen_hint: "signup" } : {}),
        ...(loginHint ? { login_hint: loginHint } : {}),
      };

      if (options?.method === "popup") {
        await loginWithPopup({
          authorizationParams,
        });
        return;
      }

      await loginWithRedirect({
        appState: {
          returnToHash: options?.returnToHash ?? (window.location.hash || "#/"),
        },
        authorizationParams,
      });
    };

    const requestPasswordReset = async (email: string): Promise<string> => {
      const trimmedEmail = email.trim();

      if (!auth0Config.domain || !auth0Config.clientId) {
        throw new Error("Auth0 domain and client ID are required.");
      }

      if (!auth0Config.connection) {
        throw new Error("Auth0 database connection is required.");
      }

      const response = await fetch(
        buildAuth0EndpointUrl(auth0Config, "/dbconnections/change_password"),
        {
          body: JSON.stringify({
            client_id: auth0Config.clientId,
            connection: auth0Config.connection,
            email: trimmedEmail,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );
      const responseBody = await response.text();

      if (!response.ok) {
        throw new Error(
          getAuth0ApiErrorMessage(
            responseBody,
            "Unable to start the password reset flow.",
          ),
        );
      }

      return (
        responseBody ||
        "If an account exists for that email, Auth0 will send reset instructions."
      );
    };

    return {
      authError: error
        ? formatAuthError(error, "Authentication failed.")
        : null,
      canRequestApiToken: Boolean(auth0Config.audience),
      config: auth0Config,
      isApiAuthReady:
        auth0Config.isConfigured &&
        Boolean(auth0Config.audience) &&
        isAuthenticated &&
        !isLoading &&
        isApiTokenResolverReady,
      isAuthenticated,
      isConfigured: auth0Config.isConfigured,
      isLoading,
      login,
      logout: () => {
        logout({
          logoutParams: {
            returnTo: window.location.origin,
          },
        });
      },
      requestPasswordReset,
      userEmail: typeof user?.email === "string" ? user.email : null,
      userName:
        typeof user?.name === "string"
          ? user.name
          : typeof user?.nickname === "string"
            ? user.nickname
            : null,
      userPicture: typeof user?.picture === "string" ? user.picture : null,
    };
  }, [
    error,
    isAuthenticated,
    isApiTokenResolverReady,
    isLoading,
    loginWithRedirect,
    loginWithPopup,
    logout,
    user?.email,
    user?.name,
    user?.nickname,
  ]);

  return (
    <AppAuthContext.Provider value={contextValue}>
      {children}
    </AppAuthContext.Provider>
  );
};

export const AppAuthProvider = ({ children }: PropsWithChildren) => {
  if (
    !auth0Config.isConfigured ||
    !auth0Config.domain ||
    !auth0Config.clientId
  ) {
    return (
      <AppAuthContext.Provider value={unauthenticatedContextValue}>
        {children}
      </AppAuthContext.Provider>
    );
  }

  return (
    <Auth0Provider
      authorizationParams={buildAuth0AuthorizationParams(auth0Config)}
      cacheLocation="localstorage"
      clientId={auth0Config.clientId}
      domain={auth0Config.domain}
      onRedirectCallback={(appState) => {
        const redirectState = appState as RedirectAppState | undefined;
        const nextHash = redirectState?.returnToHash ?? "#/";
        const cleanedUrl = `/${nextHash}`;

        window.history.replaceState({}, document.title, cleanedUrl);
      }}
    >
      <Auth0Bridge>{children}</Auth0Bridge>
    </Auth0Provider>
  );
};

export const useAppAuth = (): AppAuthContextValue => useContext(AppAuthContext);

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
import { setApiAccessTokenResolver } from "@/shared/api/http";
import {
  buildAuth0AuthorizationParams,
  getAuth0Config,
  type Auth0Config,
} from "./config";

interface AppAuthContextValue {
  authError: string | null;
  canRequestApiToken: boolean;
  config: Auth0Config;
  isApiAuthReady: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  userEmail: string | null;
  userName: string | null;
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
  userEmail: null,
  userName: null,
};

const AppAuthContext = createContext<AppAuthContextValue>(
  unauthenticatedContextValue,
);

const formatAuthError = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
};

const Auth0Bridge = ({ children }: PropsWithChildren) => {
  const {
    error,
    getAccessTokenSilently,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    user,
  } = useAuth0();
  const [isApiTokenResolverReady, setIsApiTokenResolverReady] = useState(false);
  const getAccessTokenSilentlyRef = useRef(getAccessTokenSilently);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const isLoadingRef = useRef(isLoading);

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
        throw new Error("Login with Auth0 before using protected API routes.");
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

  const contextValue = useMemo<AppAuthContextValue>(() => {
    const login = async (): Promise<void> => {
      await loginWithRedirect({
        appState: {
          returnToHash: window.location.hash || "#/",
        },
      });
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
      userEmail: typeof user?.email === "string" ? user.email : null,
      userName:
        typeof user?.name === "string"
          ? user.name
          : typeof user?.nickname === "string"
            ? user.nickname
            : null,
    };
  }, [
    error,
    isAuthenticated,
    isApiTokenResolverReady,
    isLoading,
    loginWithRedirect,
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
      clientId={auth0Config.clientId}
      domain={auth0Config.domain}
      onRedirectCallback={(appState) => {
        const redirectState = appState as RedirectAppState | undefined;
        const nextHash = redirectState?.returnToHash ?? "#/";
        const cleanedUrl = `${window.location.pathname}${nextHash}`;

        window.history.replaceState({}, document.title, cleanedUrl);
      }}
    >
      <Auth0Bridge>{children}</Auth0Bridge>
    </Auth0Provider>
  );
};

export const useAppAuth = (): AppAuthContextValue => useContext(AppAuthContext);

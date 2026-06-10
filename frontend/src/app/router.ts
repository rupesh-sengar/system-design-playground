import { useEffect, useState } from "react";

export type AuthMode = "login" | "signup" | "reset-password";

export type AppRoute =
  | {
      name: "home";
    }
  | {
      name: "account";
    }
  | {
      name: "library";
    }
  | {
      name: "onboarding";
    }
  | {
      name: "playground";
      problemId: string;
    }
  | {
      name: "pricing";
    };

const parseRoute = (hash: string): AppRoute => {
  const normalizedHash = hash.replace(/^#/, "");
  const routePath = normalizedHash.split("?")[0] ?? normalizedHash;

  if (
    routePath === "" ||
    routePath === "/" ||
    routePath === "/home"
  ) {
    return {
      name: "home",
    };
  }

  if (routePath === "/problems" || routePath === "/library") {
    return {
      name: "library",
    };
  }

  if (routePath === "/pricing") {
    return {
      name: "pricing",
    };
  }

  if (routePath === "/onboarding" || routePath === "/setup") {
    return {
      name: "onboarding",
    };
  }

  if (routePath === "/account" || routePath === "/billing") {
    return {
      name: "account",
    };
  }

  if (routePath.startsWith("/playground/")) {
    const [, , rawProblemId] = routePath.split("/");

    if (rawProblemId) {
      return {
        name: "playground",
        problemId: decodeURIComponent(rawProblemId),
      };
    }
  }

  return {
    name: "home",
  };
};

export const buildHomeRoute = (): string => "#/";

export const buildLibraryRoute = (): string => "#/problems";

export const buildPricingRoute = (): string => "#/pricing";

export const buildOnboardingRoute = (): string => "#/onboarding";

export const buildAccountRoute = (): string => "#/account";

export const buildPlaygroundRoute = (problemId: string): string =>
  `#/playground/${encodeURIComponent(problemId)}`;

export const useAppRoute = () => {
  const [route, setRoute] = useState<AppRoute>(() =>
    parseRoute(window.location.hash),
  );

  useEffect(() => {
    const handleHashChange = (): void => {
      setRoute(parseRoute(window.location.hash));
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const goToLibrary = (): void => {
    window.location.hash = buildLibraryRoute();
  };

  const goToPricing = (): void => {
    window.location.hash = buildPricingRoute();
  };

  const goToOnboarding = (): void => {
    window.location.hash = buildOnboardingRoute();
  };

  const goToAccount = (): void => {
    window.location.hash = buildAccountRoute();
  };

  const goToHome = (): void => {
    window.location.hash = buildHomeRoute();
  };

  const goToPlayground = (problemId: string): void => {
    window.location.hash = buildPlaygroundRoute(problemId);
  };

  return {
    route,
    goToAccount,
    goToHome,
    goToLibrary,
    goToOnboarding,
    goToPlayground,
    goToPricing,
  };
};

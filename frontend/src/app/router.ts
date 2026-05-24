import { useEffect, useState } from "react";

export type AuthMode = "login" | "signup" | "reset-password";

export type AppRoute =
  | {
      name: "home";
    }
  | {
      name: "library";
    }
  | {
      name: "playground";
      problemId: string;
    };

const parseRoute = (hash: string): AppRoute => {
  const normalizedHash = hash.replace(/^#/, "");

  if (
    normalizedHash === "" ||
    normalizedHash === "/" ||
    normalizedHash === "/home"
  ) {
    return {
      name: "home",
    };
  }

  if (normalizedHash === "/problems" || normalizedHash === "/library") {
    return {
      name: "library",
    };
  }

  if (normalizedHash.startsWith("/playground/")) {
    const [, , rawProblemId] = normalizedHash.split("/");

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

  const goToHome = (): void => {
    window.location.hash = buildHomeRoute();
  };

  const goToPlayground = (problemId: string): void => {
    window.location.hash = buildPlaygroundRoute(problemId);
  };

  return {
    route,
    goToHome,
    goToLibrary,
    goToPlayground,
  };
};

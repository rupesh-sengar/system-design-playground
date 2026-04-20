import { useEffect, useMemo, useState } from "react";

type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";
type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

const STORAGE_KEY = "system-design-lab.theme-preference";
const SYSTEM_THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia(SYSTEM_THEME_MEDIA_QUERY).matches ? "dark" : "light";

const applyResolvedTheme = (theme: ResolvedTheme): void => {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
};

const readStoredPreference = (): ThemePreference => {
  const storedValue = window.localStorage.getItem(STORAGE_KEY);

  if (
    storedValue === "system" ||
    storedValue === "light" ||
    storedValue === "dark"
  ) {
    return storedValue;
  }

  return "system";
};

const readInitialPreference = (): ThemePreference => {
  const preference = readStoredPreference();
  const resolvedTheme = preference === "system" ? getSystemTheme() : preference;

  applyResolvedTheme(resolvedTheme);

  return preference;
};

const ThemeIcon = ({ mode }: { mode: ThemePreference }) => {
  if (mode === "system") {
    return (
      <svg
        aria-hidden="true"
        fill="none"
        height="18"
        viewBox="0 0 24 24"
        width="18"
      >
        <rect
          height="12"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="1.8"
          width="16"
          x="4"
          y="5"
        />
        <path
          d="M9 19h6M11 17v2M13 17v2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (mode === "light") {
    return (
      <svg
        aria-hidden="true"
        fill="none"
        height="18"
        viewBox="0 0 24 24"
        width="18"
      >
        <circle
          cx="12"
          cy="12"
          r="4.25"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M12 2.75v2.5M12 18.75v2.5M21.25 12h-2.5M5.25 12h-2.5M18.54 5.46l-1.77 1.77M7.23 16.77l-1.77 1.77M18.54 18.54l-1.77-1.77M7.23 7.23L5.46 5.46"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <path
        d="M18.5 14.8A7.8 7.8 0 1 1 9.2 5.5a6.4 6.4 0 0 0 9.3 9.3Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
};

export const ThemeModeControl = () => {
  const [preference, setPreference] = useState<ThemePreference>(
    readInitialPreference,
  );
  const resolvedTheme = useMemo<ResolvedTheme>(
    () => (preference === "system" ? getSystemTheme() : preference),
    [preference],
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, preference);
    applyResolvedTheme(resolvedTheme);
  }, [preference, resolvedTheme]);

  useEffect(() => {
    if (preference !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia(
      SYSTEM_THEME_MEDIA_QUERY,
    ) as LegacyMediaQueryList;
    const handleChange = (): void => {
      applyResolvedTheme(mediaQuery.matches ? "dark" : "light");
    };

    if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    } else {
      mediaQuery.addEventListener("change", handleChange);
    }

    return () => {
      if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange);
      } else {
        mediaQuery.removeEventListener("change", handleChange);
      }
    };
  }, [preference]);

  return (
    <section className="theme-control">
      <div
        aria-label="Theme switcher"
        className="theme-control__group"
        role="radiogroup"
      >
        {(["system", "light", "dark"] as const).map((option) => (
          <button
            key={option}
            aria-checked={preference === option}
            aria-label={
              option === "system"
                ? "Use system theme"
                : option === "light"
                  ? "Use light theme"
                  : "Use dark theme"
            }
            className={`theme-control__button ${
              preference === option ? "theme-control__button--active" : ""
            }`}
            role="radio"
            title={
              option === "system"
                ? "Auto"
                : option === "light"
                  ? "Light"
                  : "Dark"
            }
            type="button"
            onClick={() => setPreference(option)}
          >
            <ThemeIcon mode={option} />
          </button>
        ))}
      </div>
    </section>
  );
};

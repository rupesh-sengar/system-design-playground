import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastTone = "success" | "error" | "info";

interface ToastRecord {
  dedupeKey?: string;
  id: string;
  message: string;
  title: string | null;
  tone: ToastTone;
}

interface ShowToastOptions {
  dedupeKey?: string;
  durationMs?: number;
  title?: string;
}

interface ToastContextValue {
  dismissToast: (id: string) => void;
  error: (message: string, options?: ShowToastOptions) => string;
  info: (message: string, options?: ShowToastOptions) => string;
  success: (message: string, options?: ShowToastOptions) => string;
}

const DEFAULT_DURATION_MS = 3800;
const MAX_VISIBLE_TOASTS = 4;

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider = ({ children }: PropsWithChildren) => {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextToastIdRef = useRef(0);
  const timeoutsRef = useRef<Record<string, number>>({});
  const toastsRef = useRef<ToastRecord[]>([]);

  const dismissToast = useCallback((id: string): void => {
    const timeoutId = timeoutsRef.current[id];

    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      delete timeoutsRef.current[id];
    }

    setToasts((currentToasts) => {
      const nextToasts = currentToasts.filter((toast) => toast.id !== id);
      toastsRef.current = nextToasts;
      return nextToasts;
    });
  }, []);

  const showToast = useCallback(
    (
      tone: ToastTone,
      message: string,
      options: ShowToastOptions = {},
    ): string => {
      const existingToast = options.dedupeKey
        ? toastsRef.current.find(
            (toast) => toast.dedupeKey === options.dedupeKey,
          )
        : undefined;
      const toastId =
        existingToast?.id ?? `toast-${String(++nextToastIdRef.current)}`;
      const nextToast: ToastRecord = {
        dedupeKey: options.dedupeKey,
        id: toastId,
        message,
        title: options.title ?? null,
        tone,
      };

      setToasts((currentToasts) => {
        const nextToasts = [
          nextToast,
          ...currentToasts.filter((toast) => toast.id !== toastId),
        ].slice(0, MAX_VISIBLE_TOASTS);

        toastsRef.current = nextToasts;
        return nextToasts;
      });

      const existingTimeoutId = timeoutsRef.current[toastId];

      if (existingTimeoutId !== undefined) {
        window.clearTimeout(existingTimeoutId);
      }

      timeoutsRef.current[toastId] = window.setTimeout(() => {
        dismissToast(toastId);
      }, options.durationMs ?? DEFAULT_DURATION_MS);

      return toastId;
    },
    [dismissToast],
  );

  useEffect(
    () => () => {
      Object.values(timeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    },
    [],
  );

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      dismissToast,
      error: (message, options) => showToast("error", message, options),
      info: (message, options) => showToast("info", message, options),
      success: (message, options) => showToast("success", message, options),
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="toast-viewport" aria-atomic="false" aria-live="polite">
        {toasts.map((toast) => (
          <article
            key={toast.id}
            className={`toast toast--${toast.tone}`}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            <div className="toast__body">
              {toast.title ? <strong>{toast.title}</strong> : null}
              <p>{toast.message}</p>
            </div>
            <button
              aria-label="Dismiss notification"
              className="toast__dismiss"
              type="button"
              onClick={() => dismissToast(toast.id)}
            >
              Close
            </button>
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const contextValue = useContext(ToastContext);

  if (!contextValue) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return contextValue;
};

import { LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { useAppAuth } from "../app-auth";
import "./auth-prompt.css";

interface AuthPromptProps {
  ariaLabel?: string;
  body?: string;
  className?: string;
  eyebrow?: string;
  signInLabel?: string;
  signupLabel?: string;
  title?: string;
}

export const AuthPrompt = ({
  ariaLabel = "Sign in to save progress",
  body = "Save progress to your account, restore practice sessions, and view protected feedback from any device.",
  className,
  eyebrow = "Guest session",
  signInLabel = "Sign in",
  signupLabel = "Create account",
  title = "Sign in to keep your work",
}: AuthPromptProps) => {
  const {
    isAuthenticated,
    isConfigured,
    isLoading,
    login,
  } = useAppAuth();

  if (!isConfigured || isAuthenticated) {
    return null;
  }

  return (
    <aside
      aria-label={ariaLabel}
      className={["auth-prompt", className].filter(Boolean).join(" ")}
    >
      <span aria-hidden="true" className="auth-prompt__icon">
        <ShieldCheck size={18} strokeWidth={2} />
      </span>
      <div className="auth-prompt__copy">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      <div className="auth-prompt__actions">
        <button
          className="auth-prompt__action auth-prompt__action--primary"
          disabled={isLoading}
          type="button"
          onClick={() => void login()}
        >
          <LogIn aria-hidden="true" size={15} strokeWidth={2} />
          {isLoading ? "Checking..." : signInLabel}
        </button>
        <button
          className="auth-prompt__action auth-prompt__action--secondary"
          disabled={isLoading}
          type="button"
          onClick={() => void login({ intent: "signup" })}
        >
          <UserPlus aria-hidden="true" size={15} strokeWidth={2} />
          {signupLabel}
        </button>
      </div>
    </aside>
  );
};

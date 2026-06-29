import {
  AlertCircle,
  Bug,
  CheckCircle2,
  Loader2,
  Send,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { getApiErrorMessage } from "@/shared/api/http";
import { useToast } from "@/shared/toast/toast-provider";
import {
  createIssueReport,
  type IssueReportCategory,
} from "../api/issueReportApi";
import "./issue-report-dialog.css";

interface IssueReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  problemId?: string | null;
  problemTitle?: string | null;
  reporterEmail?: string | null;
  reporterName?: string | null;
  routeName: string;
}

interface IssueReportFormState {
  category: IssueReportCategory;
  description: string;
  reporterEmail: string;
  reporterName: string;
  title: string;
}

const categoryOptions: Array<{
  label: string;
  value: IssueReportCategory;
}> = [
  { label: "Bug", value: "bug" },
  { label: "Content", value: "content" },
  { label: "Billing", value: "billing" },
  { label: "Usability", value: "usability" },
  { label: "Performance", value: "performance" },
  { label: "Other", value: "other" },
];

const createInitialFormState = (
  reporterName?: string | null,
  reporterEmail?: string | null,
): IssueReportFormState => ({
  category: "bug",
  description: "",
  reporterEmail: reporterEmail ?? "",
  reporterName: reporterName ?? "",
  title: "",
});

const getPagePath = (): string => {
  const pagePath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  return pagePath.slice(0, 2048);
};

const getBrowserContext = (
  routeName: string,
  problemId?: string | null,
  problemTitle?: string | null,
): Record<string, unknown> => ({
  language: navigator.language,
  problemId: problemId ?? null,
  problemTitle: problemTitle ?? null,
  routeName,
  screen: {
    height: window.screen.height,
    width: window.screen.width,
  },
  theme: document.documentElement.dataset.theme ?? null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  viewport: {
    height: window.innerHeight,
    width: window.innerWidth,
  },
});

export const IssueReportDialog = ({
  isOpen,
  onClose,
  problemId,
  problemTitle,
  reporterEmail,
  reporterName,
  routeName,
}: IssueReportDialogProps) => {
  const descriptionId = useId();
  const isSubmittingRef = useRef(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const titleId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const toast = useToast();
  const [formState, setFormState] = useState<IssueReportFormState>(() =>
    createInitialFormState(reporterName, reporterEmail),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    triggerRef.current = document.activeElement as HTMLElement | null;
    setFormState(createInitialFormState(reporterName, reporterEmail));
    setErrorMessage(null);
    const focusTimer = window.setTimeout(() => {
      titleInputRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !isSubmittingRef.current) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [isOpen, onClose, reporterEmail, reporterName]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const updateField =
    (fieldName: keyof IssueReportFormState) =>
    (
      event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ): void => {
      setFormState((currentState) => ({
        ...currentState,
        [fieldName]: event.target.value,
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = formState.title.trim();
    const description = formState.description.trim();
    const reporterNameValue = formState.reporterName.trim();
    const reporterEmailValue = formState.reporterEmail.trim();

    if (title.length < 3) {
      setErrorMessage("Add a short title so the report can be triaged.");
      return;
    }

    if (description.length < 10) {
      setErrorMessage("Add a few more details about what went wrong.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createIssueReport({
        browserContext: getBrowserContext(routeName, problemId, problemTitle),
        category: formState.category,
        description,
        pagePath: getPagePath(),
        reporterEmail: reporterEmailValue || null,
        reporterName: reporterNameValue || null,
        title,
      });
      toast.success("Your report has been saved for review.", {
        title: "Issue reported",
      });
      onClose();
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Unable to send the issue report."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="issue-report-dialog">
      <button
        aria-label="Close issue report"
        className="issue-report-dialog__backdrop"
        disabled={isSubmitting}
        type="button"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="issue-report-dialog__panel"
        role="dialog"
      >
        <div className="issue-report-dialog__header">
          <span className="issue-report-dialog__icon" aria-hidden="true">
            <Bug size={20} strokeWidth={2} />
          </span>
          <div className="issue-report-dialog__heading">
            <p className="section-label">Feedback</p>
            <h2 id={titleId}>Report an issue</h2>
            <p id={descriptionId}>
              Share enough detail for the team to reproduce and prioritize it.
            </p>
          </div>
          <button
            aria-label="Close issue report"
            className="issue-report-dialog__close"
            disabled={isSubmitting}
            type="button"
            onClick={onClose}
          >
            <X aria-hidden="true" size={18} strokeWidth={2} />
          </button>
        </div>

        <form className="issue-report-dialog__form" onSubmit={handleSubmit}>
          <label className="issue-report-dialog__field">
            <span>Category</span>
            <select
              value={formState.category}
              onChange={updateField("category")}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="issue-report-dialog__field">
            <span>Title</span>
            <input
              ref={titleInputRef}
              maxLength={160}
              placeholder="Checkout button does not respond"
              value={formState.title}
              onChange={updateField("title")}
            />
          </label>

          <label className="issue-report-dialog__field">
            <span>Details</span>
            <textarea
              maxLength={4000}
              placeholder="What happened, what you expected, and the steps to reproduce it."
              rows={6}
              value={formState.description}
              onChange={updateField("description")}
            />
          </label>

          <div className="issue-report-dialog__contact-grid">
            <label className="issue-report-dialog__field">
              <span>Name</span>
              <input
                maxLength={160}
                placeholder="Optional"
                value={formState.reporterName}
                onChange={updateField("reporterName")}
              />
            </label>

            <label className="issue-report-dialog__field">
              <span>Email</span>
              <input
                maxLength={320}
                placeholder="Optional"
                type="email"
                value={formState.reporterEmail}
                onChange={updateField("reporterEmail")}
              />
            </label>
          </div>

          <div className="issue-report-dialog__context" aria-live="polite">
            <CheckCircle2 aria-hidden="true" size={16} strokeWidth={2} />
            <span>
              Page context will be included:{" "}
              {problemTitle ? problemTitle : routeName}.
            </span>
          </div>

          {errorMessage ? (
            <div className="issue-report-dialog__error" role="alert">
              <AlertCircle aria-hidden="true" size={16} strokeWidth={2} />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <div className="issue-report-dialog__actions">
            <button
              className="secondary-action issue-report-dialog__action"
              disabled={isSubmitting}
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="primary-action issue-report-dialog__action"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <Loader2
                  aria-hidden="true"
                  className="issue-report-dialog__spinner"
                  size={16}
                  strokeWidth={2}
                />
              ) : (
                <Send aria-hidden="true" size={16} strokeWidth={2} />
              )}
              Send report
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

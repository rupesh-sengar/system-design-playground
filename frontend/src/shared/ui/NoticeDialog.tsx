import { type ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import "./notice-dialog.css";

interface NoticeDialogProps {
  actionIcon?: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  description?: string;
  eyebrow?: string;
  icon?: ReactNode;
  isOpen: boolean;
  onConfirm: () => void;
  role?: "alertdialog" | "dialog";
  title: string;
  tone?: "neutral" | "warning";
}

const getFocusableElements = (container: HTMLElement): HTMLElement[] =>
  Array.from(
    container.querySelectorAll<HTMLElement>(
      [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        '[tabindex]:not([tabindex="-1"])',
      ].join(","),
    ),
  ).filter((element) => element.offsetParent !== null);

export const NoticeDialog = ({
  actionIcon,
  children,
  confirmLabel = "Continue",
  description,
  eyebrow,
  icon,
  isOpen,
  onConfirm,
  role = "dialog",
  title,
  tone = "neutral",
}: NoticeDialogProps) => {
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    triggerRef.current = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusableElements = getFocusableElements(panelRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [isOpen]);

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

  return createPortal(
    <div className={`notice-dialog notice-dialog--${tone}`}>
      <div aria-hidden="true" className="notice-dialog__backdrop" />
      <div
        ref={panelRef}
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="notice-dialog__panel"
        role={role}
      >
        {icon ? <span className="notice-dialog__icon">{icon}</span> : null}

        <div className="notice-dialog__body">
          {eyebrow ? <p className="section-label">{eyebrow}</p> : null}
          <h2 id={titleId}>{title}</h2>
          {description ? <p id={descriptionId}>{description}</p> : null}
          {children}
        </div>

        <div className="notice-dialog__actions">
          <button
            ref={confirmButtonRef}
            className="primary-action notice-dialog__confirm"
            type="button"
            onClick={onConfirm}
          >
            {actionIcon}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

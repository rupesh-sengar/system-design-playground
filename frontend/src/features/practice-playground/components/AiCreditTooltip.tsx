import {
  cloneElement,
  type CSSProperties,
  type ReactElement,
  useId,
} from "react";
import { Sparkles } from "lucide-react";
import "./AiCreditTooltip.css";

export type AiCreditTooltipStatus =
  | "loading"
  | "ready"
  | "signed-out"
  | "unavailable";

export interface AiCreditTooltipData {
  limit: number | null;
  remaining: number | null;
  status: AiCreditTooltipStatus;
}

interface AiCreditTooltipProps {
  align?: "center" | "end" | "start";
  children: ReactElement<{ "aria-describedby"?: string }>;
  data?: AiCreditTooltipData;
  placement?: "bottom" | "top";
}

const formatCreditCount = (value: number): string =>
  value.toLocaleString("en-IN");

const getTooltipCopy = (data: AiCreditTooltipData) => {
  if (data.status === "signed-out") {
    return {
      detail: "Sign in to view your monthly AI allowance.",
      metric: "Sign in",
      percent: 0,
      summary: "Credits left",
      valueText: "Sign in required to view AI credits left",
    };
  }

  if (data.status === "loading") {
    return {
      detail: "Fetching your current monthly balance.",
      metric: "Loading",
      percent: 0,
      summary: "Credits left",
      valueText: "Loading AI credits left",
    };
  }

  if (data.status === "unavailable" || data.limit === null || data.remaining === null) {
    return {
      detail: "Credit balance could not be loaded right now.",
      metric: "Unavailable",
      percent: 0,
      summary: "Credits left",
      valueText: "AI credits left unavailable",
    };
  }

  const limit = Math.max(data.limit, 0);
  const remaining = Math.max(data.remaining, 0);
  const clampedRemaining = limit > 0 ? Math.min(remaining, limit) : 0;
  const percent =
    limit > 0 ? Math.round((clampedRemaining / limit) * 100) : 0;
  const creditLabel = remaining === 1 ? "credit" : "credits";

  return {
    detail: `${formatCreditCount(remaining)} ${creditLabel} available this month.`,
    metric: formatCreditCount(remaining),
    percent,
    summary: `of ${formatCreditCount(limit)} monthly`,
    valueText: `${formatCreditCount(remaining)} of ${formatCreditCount(
      limit,
    )} AI credits left`,
  };
};

export const AiCreditTooltip = ({
  align = "center",
  children,
  data,
  placement = "top",
}: AiCreditTooltipProps) => {
  const tooltipId = useId();

  if (!data) {
    return children;
  }

  const copy = getTooltipCopy(data);
  const describedBy = children.props["aria-describedby"]
    ? `${children.props["aria-describedby"]} ${tooltipId}`
    : tooltipId;
  const trigger = cloneElement(children, {
    "aria-describedby": describedBy,
  });

  return (
    <span
      className={`ai-credit-tooltip ai-credit-tooltip--${placement} ai-credit-tooltip--align-${align}`}
    >
      {trigger}
      <span
        className={`ai-credit-tooltip__surface ${
          data.status === "loading" ? "ai-credit-tooltip__surface--loading" : ""
        }`}
        id={tooltipId}
        role="tooltip"
      >
        <span className="ai-credit-tooltip__header">
          <span className="ai-credit-tooltip__icon" aria-hidden="true">
            <Sparkles size={14} strokeWidth={2.2} />
          </span>
          <span className="ai-credit-tooltip__copy">
            <span className="ai-credit-tooltip__label">AI credits left</span>
            <strong>{copy.metric}</strong>
            <span>{copy.summary}</span>
          </span>
        </span>
        <span
          aria-label="AI credits left"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={copy.percent}
          aria-valuetext={copy.valueText}
          className="ai-credit-tooltip__meter"
          role="progressbar"
        >
          <span
            style={
              {
                "--ai-credit-tooltip-progress": `${copy.percent}%`,
              } as CSSProperties
            }
          />
        </span>
        <span className="ai-credit-tooltip__detail">{copy.detail}</span>
      </span>
    </span>
  );
};

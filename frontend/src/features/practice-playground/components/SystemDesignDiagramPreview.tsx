import { type ReactElement, useId } from "react";
import {
  normalizeSystemDesignDiagram,
  type SystemDesignDiagram,
  type SystemDesignDiagramConnector,
  type SystemDesignDiagramNode,
  type SystemDesignNodeKind,
} from "../model/systemDesignDiagram";
import "./SystemDesignDiagramPreview.css";

interface SystemDesignDiagramPreviewProps {
  diagram: SystemDesignDiagram | null;
  title: string;
}

interface DiagramBounds {
  height: number;
  width: number;
  x: number;
  y: number;
}

interface Point {
  x: number;
  y: number;
}

const NODE_KIND_LABELS: Record<SystemDesignNodeKind, string> = {
  "api-gateway": "API",
  auth: "Auth",
  cache: "Cache",
  cdn: "Edge",
  client: "Client",
  database: "Data",
  dns: "DNS",
  external: "External",
  firewall: "WAF",
  "load-balancer": "LB",
  monitoring: "Ops",
  queue: "Queue",
  "rate-limiter": "Limit",
  scheduler: "Cron",
  search: "Index",
  service: "Service",
  "service-discovery": "Discovery",
  storage: "Store",
  stream: "Stream",
  worker: "Worker",
};

const CANVAS_MARGIN = 70;
const MAX_NODE_LINE_LENGTH = 18;
const MAX_CONNECTOR_LABEL_LENGTH = 18;

const getDiagramBounds = (nodes: SystemDesignDiagramNode[]): DiagramBounds => {
  const left = Math.min(...nodes.map((node) => node.x));
  const top = Math.min(...nodes.map((node) => node.y));
  const right = Math.max(...nodes.map((node) => node.x + node.width));
  const bottom = Math.max(...nodes.map((node) => node.y + node.height));

  return {
    height: Math.max(bottom - top + CANVAS_MARGIN * 2, 420),
    width: Math.max(right - left + CANVAS_MARGIN * 2, 720),
    x: left - CANVAS_MARGIN,
    y: top - CANVAS_MARGIN,
  };
};

const nodeCenter = (node: SystemDesignDiagramNode): Point => ({
  x: node.x + node.width / 2,
  y: node.y + node.height / 2,
});

const connectorPoints = (
  fromNode: SystemDesignDiagramNode,
  toNode: SystemDesignDiagramNode,
): {
  end: Point;
  label: Point;
  start: Point;
} => {
  const start = nodeCenter(fromNode);
  const end = nodeCenter(toNode);

  return {
    end,
    label: {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    },
    start,
  };
};

const truncateLabel = (label: string, maxLength: number): string => {
  const normalizedLabel = label.replace(/\s+/g, " ").trim();

  return normalizedLabel.length > maxLength
    ? `${normalizedLabel.slice(0, maxLength - 3)}...`
    : normalizedLabel;
};

const wrapNodeLabel = (label: string): string[] => {
  const words = label.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];

  words.forEach((word) => {
    if (lines.length === 0) {
      lines.push(word);
      return;
    }

    const currentLine = lines[lines.length - 1] ?? "";
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length <= MAX_NODE_LINE_LENGTH) {
      lines[lines.length - 1] = nextLine;
      return;
    }

    lines.push(word);
  });

  if (lines.length <= 2) {
    return lines.length > 0 ? lines : ["Component"];
  }

  return [
    lines[0],
    truncateLabel(lines.slice(1).join(" "), MAX_NODE_LINE_LENGTH),
  ];
};

const renderConnectorLabel = (
  connector: SystemDesignDiagramConnector,
  labelPoint: Point,
): ReactElement | null => {
  if (!connector.label.trim()) {
    return null;
  }

  const label = truncateLabel(connector.label, MAX_CONNECTOR_LABEL_LENGTH);
  const labelWidth = Math.max(42, label.length * 7 + 18);

  return (
    <g
      className="system-diagram-preview__connector-label"
      transform={`translate(${labelPoint.x - labelWidth / 2} ${labelPoint.y - 14})`}
    >
      <rect height={22} rx={7} width={labelWidth} x={0} y={0} />
      <text x={labelWidth / 2} y={15}>
        {label}
      </text>
    </g>
  );
};

const renderNode = (node: SystemDesignDiagramNode): ReactElement => {
  const labelLines = wrapNodeLabel(node.label);
  const labelStartY = node.y + (labelLines.length === 1 ? 35 : 29);

  return (
    <g
      key={node.id}
      className="system-diagram-preview__node"
      transform={`translate(${node.x} ${node.y})`}
    >
      <rect
        className={`system-diagram-preview__node-shape system-diagram-preview__node-shape--${node.kind}`}
        height={node.height}
        rx={8}
        width={node.width}
        x={0}
        y={0}
      />
      <text className="system-diagram-preview__node-label" x={node.width / 2}>
        {labelLines.map((line, lineIndex) => (
          <tspan
            key={`${node.id}-${lineIndex}`}
            x={node.width / 2}
            y={labelStartY + lineIndex * 16}
          >
            {line}
          </tspan>
        ))}
      </text>
      <text
        className="system-diagram-preview__node-kind"
        x={node.width / 2}
        y={node.height - 10}
      >
        {NODE_KIND_LABELS[node.kind]}
      </text>
    </g>
  );
};

export const SystemDesignDiagramPreview = ({
  diagram,
  title,
}: SystemDesignDiagramPreviewProps): ReactElement | null => {
  const markerId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const normalizedDiagram = normalizeSystemDesignDiagram(diagram);

  if (!normalizedDiagram || normalizedDiagram.nodes.length === 0) {
    return null;
  }

  const bounds = getDiagramBounds(normalizedDiagram.nodes);
  const nodesById = new Map(
    normalizedDiagram.nodes.map((node) => [node.id, node]),
  );
  const arrowMarkerId = `system-diagram-preview-arrow-${markerId}`;
  const gridPatternId = `system-diagram-preview-grid-${markerId}`;

  return (
    <figure className="system-diagram-preview">
      <figcaption>{title}</figcaption>
      <div className="system-diagram-preview__viewport">
        <svg
          aria-label={title}
          className="system-diagram-preview__canvas"
          role="img"
          viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
        >
          <defs>
            <pattern
              height={32}
              id={gridPatternId}
              patternUnits="userSpaceOnUse"
              width={32}
            >
              <path d="M 32 0 L 0 0 0 32" />
            </pattern>
            <marker
              id={arrowMarkerId}
              markerHeight={8}
              markerWidth={8}
              orient="auto-start-reverse"
              refX={7}
              refY={4}
              viewBox="0 0 8 8"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" />
            </marker>
          </defs>
          <rect
            className="system-diagram-preview__grid"
            fill={`url(#${gridPatternId})`}
            height={bounds.height}
            width={bounds.width}
            x={bounds.x}
            y={bounds.y}
          />
          <g className="system-diagram-preview__connectors">
            {normalizedDiagram.connectors.map((connector) => {
              const fromNode = nodesById.get(connector.fromNodeId);
              const toNode = nodesById.get(connector.toNodeId);

              if (!fromNode || !toNode) {
                return null;
              }

              const points = connectorPoints(fromNode, toNode);
              const hasEndMarker = connector.kind !== "plain";
              const hasStartMarker = connector.kind === "bidirectional";

              return (
                <g
                  key={connector.id}
                  className={`system-diagram-preview__connector system-diagram-preview__connector--${connector.kind}`}
                >
                  <line
                    className={`system-diagram-preview__connector-line system-diagram-preview__connector-line--${connector.kind}`}
                    markerEnd={
                      hasEndMarker ? `url(#${arrowMarkerId})` : undefined
                    }
                    markerStart={
                      hasStartMarker ? `url(#${arrowMarkerId})` : undefined
                    }
                    x1={points.start.x}
                    x2={points.end.x}
                    y1={points.start.y}
                    y2={points.end.y}
                  />
                  {renderConnectorLabel(connector, points.label)}
                </g>
              );
            })}
          </g>
          <g className="system-diagram-preview__nodes">
            {normalizedDiagram.nodes.map(renderNode)}
          </g>
        </svg>
      </div>
    </figure>
  );
};

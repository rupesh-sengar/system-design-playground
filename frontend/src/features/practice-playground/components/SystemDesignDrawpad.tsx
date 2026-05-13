import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type WheelEvent as ReactWheelEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AppWindow,
  Box,
  Boxes,
  Cable,
  Cloud,
  Copy,
  Cpu,
  Database,
  HardDrive,
  Link2,
  Maximize2,
  MousePointer2,
  Network,
  RotateCcw,
  Router,
  Server,
  Trash2,
  Workflow,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";
import {
  createDefaultSystemDesignNode,
  createEmptySystemDesignDiagram,
  createSystemArchitectureTemplate,
  normalizeSystemDesignDiagram,
  type SystemDesignDiagram,
  type SystemDesignDiagramConnector,
  type SystemDesignDiagramNode,
  type SystemDesignNodeKind,
} from "../model/systemDesignDiagram";
import "./SystemDesignDrawpad.css";

interface SystemDesignDrawpadProps {
  value: SystemDesignDiagram | null;
  onChange: (diagram: SystemDesignDiagram | null) => void;
}

type DrawpadMode = "select" | "connector";
type Selection =
  | {
      id: string;
      type: "connector" | "node";
    }
  | null;

interface DragState {
  nodeId: string;
  offsetX: number;
  offsetY: number;
  pointerId: number;
}

interface PanState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startViewport: Viewport;
}

interface Point {
  x: number;
  y: number;
}

interface Viewport {
  height: number;
  width: number;
  x: number;
  y: number;
}

interface CanvasClientPoint {
  clientX: number;
  clientY: number;
}

interface NodeKindMeta {
  icon: LucideIcon;
  label: string;
  shape: "cylinder" | "queue" | "rect";
}

const BASE_CANVAS_WIDTH = 1400;
const BASE_CANVAS_HEIGHT = 860;
const DEFAULT_VIEWPORT: Viewport = {
  height: BASE_CANVAS_HEIGHT,
  width: BASE_CANVAS_WIDTH,
  x: 0,
  y: 0,
};
const MIN_ZOOM = 0.28;
const MAX_ZOOM = 2.8;
const VIEW_FIT_MARGIN = 180;
const NODE_KIND_META: Record<SystemDesignNodeKind, NodeKindMeta> = {
  "api-gateway": {
    icon: Router,
    label: "API",
    shape: "rect",
  },
  cache: {
    icon: HardDrive,
    label: "Cache",
    shape: "cylinder",
  },
  cdn: {
    icon: Cloud,
    label: "CDN",
    shape: "rect",
  },
  client: {
    icon: AppWindow,
    label: "Client",
    shape: "rect",
  },
  database: {
    icon: Database,
    label: "DB",
    shape: "cylinder",
  },
  external: {
    icon: Cable,
    label: "External",
    shape: "rect",
  },
  "load-balancer": {
    icon: Network,
    label: "LB",
    shape: "rect",
  },
  queue: {
    icon: Boxes,
    label: "Queue",
    shape: "queue",
  },
  service: {
    icon: Server,
    label: "Service",
    shape: "rect",
  },
  storage: {
    icon: Box,
    label: "Store",
    shape: "cylinder",
  },
  stream: {
    icon: Workflow,
    label: "Stream",
    shape: "queue",
  },
  worker: {
    icon: Cpu,
    label: "Worker",
    shape: "rect",
  },
};

const PALETTE: SystemDesignNodeKind[] = [
  "client",
  "cdn",
  "load-balancer",
  "api-gateway",
  "service",
  "database",
  "cache",
  "queue",
  "stream",
  "worker",
  "storage",
  "external",
];

const createConnectorId = (): string => `edge-${Date.now()}`;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const getZoomFromViewport = (viewport: Viewport): number =>
  BASE_CANVAS_WIDTH / viewport.width;

const getViewportFromZoom = (
  viewport: Viewport,
  nextZoom: number,
  anchorPoint: Point = {
    x: viewport.x + viewport.width / 2,
    y: viewport.y + viewport.height / 2,
  },
): Viewport => {
  const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  const nextWidth = BASE_CANVAS_WIDTH / zoom;
  const nextHeight = BASE_CANVAS_HEIGHT / zoom;
  const anchorRatioX = (anchorPoint.x - viewport.x) / viewport.width;
  const anchorRatioY = (anchorPoint.y - viewport.y) / viewport.height;

  return {
    height: nextHeight,
    width: nextWidth,
    x: anchorPoint.x - anchorRatioX * nextWidth,
    y: anchorPoint.y - anchorRatioY * nextHeight,
  };
};

const getViewportForDiagram = (diagram: SystemDesignDiagram): Viewport => {
  if (diagram.nodes.length === 0) {
    return DEFAULT_VIEWPORT;
  }

  const left = Math.min(...diagram.nodes.map((node) => node.x));
  const top = Math.min(...diagram.nodes.map((node) => node.y));
  const right = Math.max(...diagram.nodes.map((node) => node.x + node.width));
  const bottom = Math.max(
    ...diagram.nodes.map((node) => node.y + node.height),
  );
  const diagramWidth = Math.max(right - left + VIEW_FIT_MARGIN * 2, 1);
  const diagramHeight = Math.max(bottom - top + VIEW_FIT_MARGIN * 2, 1);
  const zoom = clamp(
    Math.min(BASE_CANVAS_WIDTH / diagramWidth, BASE_CANVAS_HEIGHT / diagramHeight),
    MIN_ZOOM,
    MAX_ZOOM,
  );
  const width = BASE_CANVAS_WIDTH / zoom;
  const height = BASE_CANVAS_HEIGHT / zoom;

  return {
    height,
    width,
    x: left + (right - left) / 2 - width / 2,
    y: top + (bottom - top) / 2 - height / 2,
  };
};

const getNodeCenter = (node: SystemDesignDiagramNode): Point => ({
  x: node.x + node.width / 2,
  y: node.y + node.height / 2,
});

const getEdgePoint = (
  sourceNode: SystemDesignDiagramNode,
  targetNode: SystemDesignDiagramNode,
): Point => {
  const sourceCenter = getNodeCenter(sourceNode);
  const targetCenter = getNodeCenter(targetNode);
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;

  if (dx === 0 && dy === 0) {
    return sourceCenter;
  }

  const xScale = dx === 0 ? Number.POSITIVE_INFINITY : sourceNode.width / 2 / Math.abs(dx);
  const yScale =
    dy === 0 ? Number.POSITIVE_INFINITY : sourceNode.height / 2 / Math.abs(dy);
  const scale = Math.min(xScale, yScale);

  return {
    x: sourceCenter.x + dx * scale,
    y: sourceCenter.y + dy * scale,
  };
};

const getConnectorPath = (
  fromNode: SystemDesignDiagramNode,
  toNode: SystemDesignDiagramNode,
): {
  end: Point;
  midpoint: Point;
  path: string;
  start: Point;
} => {
  const start = getEdgePoint(fromNode, toNode);
  const end = getEdgePoint(toNode, fromNode);
  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };

  return {
    end,
    midpoint,
    path: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
    start,
  };
};

const wrapLabel = (label: string): string[] => {
  const words = label.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];

  for (const word of words) {
    const currentLine = lines[lines.length - 1];

    if (!currentLine) {
      lines.push(word);
      continue;
    }

    if (`${currentLine} ${word}`.length <= 18) {
      lines[lines.length - 1] = `${currentLine} ${word}`;
      continue;
    }

    if (lines.length < 2) {
      lines.push(word);
    }
  }

  return lines.map((line, index) =>
    index === 1 && words.join(" ").length > lines.join(" ").length
      ? `${line.slice(0, 15)}...`
      : line,
  );
};

export const SystemDesignDrawpad = ({
  value,
  onChange,
}: SystemDesignDrawpadProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [mode, setMode] = useState<DrawpadMode>("select");
  const [selection, setSelection] = useState<Selection>(null);
  const [connectorSourceId, setConnectorSourceId] = useState<string | null>(
    null,
  );
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [panState, setPanState] = useState<PanState | null>(null);
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const diagram = useMemo(
    () => normalizeSystemDesignDiagram(value) ?? createEmptySystemDesignDiagram(),
    [value],
  );
  const zoomPercent = Math.round(getZoomFromViewport(viewport) * 100);
  const nodesById = useMemo(
    () => new Map(diagram.nodes.map((node) => [node.id, node])),
    [diagram.nodes],
  );
  const selectedNode =
    selection?.type === "node" ? nodesById.get(selection.id) ?? null : null;
  const selectedConnector =
    selection?.type === "connector"
      ? diagram.connectors.find((connector) => connector.id === selection.id) ??
        null
      : null;

  const commitDiagram = (nextDiagram: SystemDesignDiagram): void => {
    onChange(normalizeSystemDesignDiagram(nextDiagram));
  };

  const getCanvasPoint = (event: CanvasClientPoint): Point => {
    const svgElement = svgRef.current;

    if (!svgElement) {
      return {
        x: 0,
        y: 0,
      };
    }

    const bounds = svgElement.getBoundingClientRect();

    return {
      x:
        viewport.x +
        ((event.clientX - bounds.left) / bounds.width) * viewport.width,
      y:
        viewport.y +
        ((event.clientY - bounds.top) / bounds.height) * viewport.height,
    };
  };

  const setZoom = (
    nextZoom: number,
    anchorPoint?: Point,
  ): void => {
    setViewport((currentViewport) =>
      getViewportFromZoom(currentViewport, nextZoom, anchorPoint),
    );
  };

  const zoomIn = (): void => {
    setZoom(getZoomFromViewport(viewport) * 1.18);
  };

  const zoomOut = (): void => {
    setZoom(getZoomFromViewport(viewport) / 1.18);
  };

  const resetViewport = (): void => {
    setViewport(getViewportForDiagram(diagram));
  };

  const addNode = (kind: SystemDesignNodeKind): void => {
    const baseNode = createDefaultSystemDesignNode(kind, diagram.nodes.length);
    const offset = (diagram.nodes.length % 6) * 26;
    const nextNode = {
      ...baseNode,
      x: viewport.x + viewport.width / 2 - baseNode.width / 2 + offset,
      y: viewport.y + viewport.height / 2 - baseNode.height / 2 + offset,
    };

    commitDiagram({
      ...diagram,
      nodes: [...diagram.nodes, nextNode],
    });
    setMode("select");
    setConnectorSourceId(null);
    setSelection({
      id: nextNode.id,
      type: "node",
    });
  };

  const addConnector = (
    fromNodeId: string,
    toNodeId: string,
  ): SystemDesignDiagram => {
    const connectorExists = diagram.connectors.some(
      (connector) =>
        connector.fromNodeId === fromNodeId && connector.toNodeId === toNodeId,
    );

    if (connectorExists) {
      return diagram;
    }

    const nextConnector: SystemDesignDiagramConnector = {
      fromNodeId,
      id: createConnectorId(),
      label: "",
      toNodeId,
    };
    const nextDiagram = {
      ...diagram,
      connectors: [...diagram.connectors, nextConnector],
    };

    setSelection({
      id: nextConnector.id,
      type: "connector",
    });

    return nextDiagram;
  };

  const deleteSelection = (): void => {
    if (!selection) {
      return;
    }

    if (selection.type === "node") {
      commitDiagram({
        connectors: diagram.connectors.filter(
          (connector) =>
            connector.fromNodeId !== selection.id &&
            connector.toNodeId !== selection.id,
        ),
        nodes: diagram.nodes.filter((node) => node.id !== selection.id),
      });
    } else {
      commitDiagram({
        ...diagram,
        connectors: diagram.connectors.filter(
          (connector) => connector.id !== selection.id,
        ),
      });
    }

    setConnectorSourceId(null);
    setSelection(null);
  };

  const duplicateSelectedNode = (): void => {
    if (!selectedNode) {
      return;
    }

    const nextNode: SystemDesignDiagramNode = {
      ...selectedNode,
      id: `node-${Date.now()}`,
      label: `${selectedNode.label} copy`.slice(0, 80),
      x: selectedNode.x + 42,
      y: selectedNode.y + 42,
    };

    commitDiagram({
      ...diagram,
      nodes: [...diagram.nodes, nextNode],
    });
    setSelection({
      id: nextNode.id,
      type: "node",
    });
  };

  const updateSelectedLabel = (label: string): void => {
    if (selectedNode) {
      commitDiagram({
        ...diagram,
        nodes: diagram.nodes.map((node) =>
          node.id === selectedNode.id
            ? {
                ...node,
                label,
              }
            : node,
        ),
      });
      return;
    }

    if (selectedConnector) {
      commitDiagram({
        ...diagram,
        connectors: diagram.connectors.map((connector) =>
          connector.id === selectedConnector.id
            ? {
                ...connector,
                label,
              }
            : connector,
        ),
      });
    }
  };

  const handleTemplateClick = (): void => {
    if (
      diagram.nodes.length > 0 &&
      !window.confirm("Replace the current architecture diagram?")
    ) {
      return;
    }

    const template = createSystemArchitectureTemplate();

    commitDiagram(template);
    setViewport(getViewportForDiagram(template));
    setConnectorSourceId(null);
    setSelection(null);
    setMode("select");
  };

  const handleClearClick = (): void => {
    if (
      diagram.nodes.length > 0 &&
      !window.confirm("Clear the architecture diagram?")
    ) {
      return;
    }

    commitDiagram(createEmptySystemDesignDiagram());
    setViewport(DEFAULT_VIEWPORT);
    setConnectorSourceId(null);
    setSelection(null);
  };

  const handleNodePointerDown = (
    event: ReactPointerEvent<SVGGElement>,
    node: SystemDesignDiagramNode,
  ): void => {
    event.stopPropagation();

    if (mode === "connector") {
      if (connectorSourceId && connectorSourceId !== node.id) {
        commitDiagram(addConnector(connectorSourceId, node.id));
        setConnectorSourceId(node.id);
        return;
      }

      setConnectorSourceId(node.id);
      setSelection({
        id: node.id,
        type: "node",
      });
      return;
    }

    const pointer = getCanvasPoint(event);

    setConnectorSourceId(null);
    setSelection({
      id: node.id,
      type: "node",
    });
    setDragState({
      nodeId: node.id,
      offsetX: pointer.x - node.x,
      offsetY: pointer.y - node.y,
      pointerId: event.pointerId,
    });
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const handleCanvasPointerDown = (
    event: ReactPointerEvent<SVGSVGElement>,
  ): void => {
    setSelection(null);
    setConnectorSourceId(null);

    if (mode !== "select") {
      return;
    }

    setPanState({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startViewport: viewport,
    });
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const handleCanvasPointerMove = (
    event: ReactPointerEvent<SVGSVGElement>,
  ): void => {
    if (panState) {
      const svgElement = svgRef.current;

      if (!svgElement) {
        return;
      }

      const bounds = svgElement.getBoundingClientRect();
      const deltaX =
        ((event.clientX - panState.startClientX) / bounds.width) *
        panState.startViewport.width;
      const deltaY =
        ((event.clientY - panState.startClientY) / bounds.height) *
        panState.startViewport.height;

      setViewport({
        ...panState.startViewport,
        x: panState.startViewport.x - deltaX,
        y: panState.startViewport.y - deltaY,
      });
      return;
    }

    if (!dragState) {
      return;
    }

    const draggedNode = nodesById.get(dragState.nodeId);

    if (!draggedNode) {
      return;
    }

    const pointer = getCanvasPoint(event);
    const nextPosition = {
      x: pointer.x - dragState.offsetX,
      y: pointer.y - dragState.offsetY,
    };

    commitDiagram({
      ...diagram,
      nodes: diagram.nodes.map((node) =>
        node.id === dragState.nodeId
          ? {
              ...node,
              ...nextPosition,
            }
          : node,
      ),
    });
  };

  const handleCanvasPointerUp = (): void => {
    if (dragState) {
      svgRef.current?.releasePointerCapture(dragState.pointerId);
    }

    if (panState) {
      svgRef.current?.releasePointerCapture(panState.pointerId);
    }

    setDragState(null);
    setPanState(null);
  };

  const handleCanvasWheel = (
    event: ReactWheelEvent<SVGSVGElement>,
  ): void => {
    event.preventDefault();

    const anchorPoint = getCanvasPoint(event);
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;

    setZoom(getZoomFromViewport(viewport) * zoomFactor, anchorPoint);
  };

  const handleCanvasKeyDown = (
    event: KeyboardEvent<SVGSVGElement>,
  ): void => {
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      deleteSelection();
    }

    if (event.key === "Escape") {
      setConnectorSourceId(null);
      setSelection(null);
    }

    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomIn();
    }

    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomOut();
    }

    if (event.key === "0") {
      event.preventDefault();
      resetViewport();
    }
  };

  const renderNodeShape = (node: SystemDesignDiagramNode): ReactElement => {
    const meta = NODE_KIND_META[node.kind];
    const labelLines = wrapLabel(node.label);

    return (
      <>
        <rect
          className={`system-drawpad__node-shape system-drawpad__node-shape--${node.kind}`}
          height={node.height}
          rx={meta.shape === "rect" ? 14 : 12}
          width={node.width}
          x={node.x}
          y={node.y}
        />
        {meta.shape === "cylinder" ? (
          <>
            <ellipse
              className={`system-drawpad__node-cap system-drawpad__node-shape--${node.kind}`}
              cx={node.x + node.width / 2}
              cy={node.y + 13}
              rx={node.width / 2}
              ry={13}
            />
            <path
              className="system-drawpad__node-cap-line"
              d={`M ${node.x} ${node.y + 13} C ${node.x} ${node.y + 30} ${
                node.x + node.width
              } ${node.y + 30} ${node.x + node.width} ${node.y + 13}`}
            />
          </>
        ) : null}
        {meta.shape === "queue" ? (
          <>
            <line
              className="system-drawpad__queue-line"
              x1={node.x + 18}
              x2={node.x + node.width - 18}
              y1={node.y + 24}
              y2={node.y + 24}
            />
            <line
              className="system-drawpad__queue-line"
              x1={node.x + 18}
              x2={node.x + node.width - 18}
              y1={node.y + node.height - 24}
              y2={node.y + node.height - 24}
            />
          </>
        ) : null}
        <text
          className="system-drawpad__node-label"
          textAnchor="middle"
          x={node.x + node.width / 2}
          y={node.y + node.height / 2 - (labelLines.length - 1) * 9}
        >
          {labelLines.map((line, index) => (
            <tspan
              key={`${node.id}-${line}-${index}`}
              x={node.x + node.width / 2}
              dy={index === 0 ? 0 : 18}
            >
              {line}
            </tspan>
          ))}
        </text>
        <text
          className="system-drawpad__node-kind"
          textAnchor="middle"
          x={node.x + node.width / 2}
          y={node.y + node.height - 10}
        >
          {meta.label}
        </text>
      </>
    );
  };

  return (
    <div className="system-drawpad">
      <div className="system-drawpad__toolbar">
        <div
          aria-label="Drawpad mode"
          className="system-drawpad__mode-group"
          role="group"
        >
          <button
            aria-label="Select and move"
            aria-pressed={mode === "select"}
            className={`system-drawpad__icon-button ${
              mode === "select" ? "system-drawpad__icon-button--active" : ""
            }`}
            title="Select"
            type="button"
            onClick={() => {
              setMode("select");
              setConnectorSourceId(null);
            }}
          >
            <MousePointer2 aria-hidden="true" size={16} strokeWidth={2} />
          </button>
          <button
            aria-label="Connect components"
            aria-pressed={mode === "connector"}
            className={`system-drawpad__icon-button ${
              mode === "connector" ? "system-drawpad__icon-button--active" : ""
            }`}
            title="Connector"
            type="button"
            onClick={() => {
              setMode("connector");
              setDragState(null);
            }}
          >
            <Link2 aria-hidden="true" size={16} strokeWidth={2} />
          </button>
        </div>

        <div
          aria-label="System components"
          className="system-drawpad__palette"
          role="group"
        >
          {PALETTE.map((kind) => {
            const meta = NODE_KIND_META[kind];
            const Icon = meta.icon;

            return (
              <button
                key={kind}
                className="system-drawpad__palette-button"
                title={`Add ${meta.label}`}
                type="button"
                onClick={() => addNode(kind)}
              >
                <Icon aria-hidden="true" size={15} strokeWidth={2} />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        <div
          aria-label="Canvas zoom"
          className="system-drawpad__zoom-controls"
          role="group"
        >
          <button
            className="system-drawpad__icon-button"
            title="Zoom out"
            type="button"
            onClick={zoomOut}
          >
            <ZoomOut aria-hidden="true" size={15} strokeWidth={2} />
          </button>
          <span className="system-drawpad__zoom-label">{zoomPercent}%</span>
          <button
            className="system-drawpad__icon-button"
            title="Zoom in"
            type="button"
            onClick={zoomIn}
          >
            <ZoomIn aria-hidden="true" size={15} strokeWidth={2} />
          </button>
          <button
            className="system-drawpad__icon-button"
            title="Fit view"
            type="button"
            onClick={resetViewport}
          >
            <Maximize2 aria-hidden="true" size={15} strokeWidth={2} />
          </button>
        </div>

        <div
          aria-label="Diagram actions"
          className="system-drawpad__actions"
          role="group"
        >
          <button
            className="system-drawpad__action-button"
            title="Use template"
            type="button"
            onClick={handleTemplateClick}
          >
            <Network aria-hidden="true" size={15} strokeWidth={2} />
            Template
          </button>
          <button
            className="system-drawpad__icon-button"
            disabled={!selectedNode}
            title="Duplicate"
            type="button"
            onClick={duplicateSelectedNode}
          >
            <Copy aria-hidden="true" size={15} strokeWidth={2} />
          </button>
          <button
            className="system-drawpad__icon-button"
            disabled={!selection}
            title="Delete"
            type="button"
            onClick={deleteSelection}
          >
            <Trash2 aria-hidden="true" size={15} strokeWidth={2} />
          </button>
          <button
            className="system-drawpad__icon-button"
            disabled={diagram.nodes.length === 0}
            title="Clear"
            type="button"
            onClick={handleClearClick}
          >
            <RotateCcw aria-hidden="true" size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="system-drawpad__body">
        <div className="system-drawpad__surface">
          <svg
            ref={svgRef}
            aria-label="System design diagram canvas"
            className={`system-drawpad__canvas system-drawpad__canvas--${mode} ${
              panState ? "system-drawpad__canvas--panning" : ""
            }`}
            role="img"
            tabIndex={0}
            viewBox={`${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`}
            onKeyDown={handleCanvasKeyDown}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerCancel={handleCanvasPointerUp}
            onPointerUp={handleCanvasPointerUp}
            onWheel={handleCanvasWheel}
          >
            <defs>
              <pattern
                id="system-drawpad-grid"
                height="40"
                patternUnits="userSpaceOnUse"
                width="40"
              >
                <path d="M 40 0 L 0 0 0 40" />
              </pattern>
              <marker
                id="system-drawpad-arrow"
                markerHeight="10"
                markerWidth="10"
                orient="auto"
                refX="8"
                refY="5"
                viewBox="0 0 10 10"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
            </defs>
            <rect
              className="system-drawpad__grid"
              height={viewport.height + 160}
              width={viewport.width + 160}
              x={viewport.x - 80}
              y={viewport.y - 80}
            />

            <g className="system-drawpad__connectors">
              {diagram.connectors.map((connector) => {
                const fromNode = nodesById.get(connector.fromNodeId);
                const toNode = nodesById.get(connector.toNodeId);

                if (!fromNode || !toNode) {
                  return null;
                }

                const connectorPath = getConnectorPath(fromNode, toNode);
                const isSelected =
                  selection?.type === "connector" &&
                  selection.id === connector.id;

                return (
                  <g
                    key={connector.id}
                    className={`system-drawpad__connector ${
                      isSelected ? "system-drawpad__connector--selected" : ""
                    }`}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setMode("select");
                      setConnectorSourceId(null);
                      setSelection({
                        id: connector.id,
                        type: "connector",
                      });
                    }}
                  >
                    <path
                      className="system-drawpad__connector-hit"
                      d={connectorPath.path}
                    />
                    <path
                      className="system-drawpad__connector-line"
                      d={connectorPath.path}
                    />
                    {connector.label ? (
                      <g className="system-drawpad__connector-label">
                        <rect
                          height="24"
                          rx="12"
                          width={Math.min(160, connector.label.length * 8 + 22)}
                          x={
                            connectorPath.midpoint.x -
                            Math.min(160, connector.label.length * 8 + 22) / 2
                          }
                          y={connectorPath.midpoint.y - 32}
                        />
                        <text
                          textAnchor="middle"
                          x={connectorPath.midpoint.x}
                          y={connectorPath.midpoint.y - 16}
                        >
                          {connector.label.slice(0, 22)}
                        </text>
                      </g>
                    ) : null}
                  </g>
                );
              })}
            </g>

            <g className="system-drawpad__nodes">
              {diagram.nodes.map((node) => {
                const isSelected =
                  selection?.type === "node" && selection.id === node.id;
                const isConnectorSource = connectorSourceId === node.id;

                return (
                  <g
                    key={node.id}
                    className={`system-drawpad__node ${
                      isSelected ? "system-drawpad__node--selected" : ""
                    } ${
                      isConnectorSource
                        ? "system-drawpad__node--connector-source"
                        : ""
                    }`}
                    onPointerDown={(event) => handleNodePointerDown(event, node)}
                  >
                    {renderNodeShape(node)}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <aside className="system-drawpad__inspector">
          <div className="system-drawpad__inspector-head">
            <span className="section-label">Diagram</span>
            <strong>{diagram.nodes.length} components</strong>
          </div>

          {selectedNode ? (
            <div className="system-drawpad__inspector-fields">
              <label className="system-drawpad__field">
                <span>Label</span>
                <input
                  maxLength={80}
                  type="text"
                  value={selectedNode.label}
                  onChange={(event) => updateSelectedLabel(event.target.value)}
                />
              </label>
              <div className="system-drawpad__meta-row">
                <span>Type</span>
                <strong>{NODE_KIND_META[selectedNode.kind].label}</strong>
              </div>
              <div className="system-drawpad__meta-row">
                <span>Position</span>
                <strong>
                  {Math.round(selectedNode.x)}, {Math.round(selectedNode.y)}
                </strong>
              </div>
            </div>
          ) : null}

          {selectedConnector ? (
            <div className="system-drawpad__inspector-fields">
              <label className="system-drawpad__field">
                <span>Label</span>
                <input
                  maxLength={80}
                  placeholder="request, write, event"
                  type="text"
                  value={selectedConnector.label}
                  onChange={(event) => updateSelectedLabel(event.target.value)}
                />
              </label>
              <div className="system-drawpad__meta-row">
                <span>From</span>
                <strong>
                  {nodesById.get(selectedConnector.fromNodeId)?.label ?? "Node"}
                </strong>
              </div>
              <div className="system-drawpad__meta-row">
                <span>To</span>
                <strong>
                  {nodesById.get(selectedConnector.toNodeId)?.label ?? "Node"}
                </strong>
              </div>
            </div>
          ) : null}

          {!selectedNode && !selectedConnector ? (
            <dl className="system-drawpad__stats">
              <div>
                <dt>Links</dt>
                <dd>{diagram.connectors.length}</dd>
              </div>
              <div>
                <dt>Mode</dt>
                <dd>{mode === "connector" ? "Connector" : "Select"}</dd>
              </div>
            </dl>
          ) : null}
        </aside>
      </div>
    </div>
  );
};

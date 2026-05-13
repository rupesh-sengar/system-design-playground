export const systemDesignNodeKinds = [
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
] as const;

export type SystemDesignNodeKind = (typeof systemDesignNodeKinds)[number];

export interface SystemDesignDiagramNode {
  height: number;
  id: string;
  kind: SystemDesignNodeKind;
  label: string;
  width: number;
  x: number;
  y: number;
}

export interface SystemDesignDiagramConnector {
  fromNodeId: string;
  id: string;
  label: string;
  toNodeId: string;
}

export interface SystemDesignDiagram {
  connectors: SystemDesignDiagramConnector[];
  nodes: SystemDesignDiagramNode[];
}

const DEFAULT_NODE_WIDTH = 152;
const DEFAULT_NODE_HEIGHT = 76;
const MAX_LABEL_LENGTH = 80;
const MIN_COORDINATE = -100000;
const MAX_COORDINATE = 100000;

const defaultLabelByKind: Record<SystemDesignNodeKind, string> = {
  "api-gateway": "API Gateway",
  cache: "Cache",
  cdn: "CDN",
  client: "Client",
  database: "Primary DB",
  external: "External API",
  "load-balancer": "Load Balancer",
  queue: "Queue",
  service: "Service",
  storage: "Object Store",
  stream: "Event Stream",
  worker: "Worker",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNodeKind = (value: unknown): value is SystemDesignNodeKind =>
  typeof value === "string" &&
  systemDesignNodeKinds.includes(value as SystemDesignNodeKind);

const clampNumber = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
};

const normalizeLabel = (value: unknown, fallback: string): string => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0
    ? trimmedValue.slice(0, MAX_LABEL_LENGTH)
    : fallback;
};

export const createEmptySystemDesignDiagram = (): SystemDesignDiagram => ({
  connectors: [],
  nodes: [],
});

export const createDefaultSystemDesignNode = (
  kind: SystemDesignNodeKind,
  index: number,
): SystemDesignDiagramNode => {
  const column = index % 4;
  const row = Math.floor(index / 4);

  return {
    height: DEFAULT_NODE_HEIGHT,
    id: `node-${Date.now()}-${index}`,
    kind,
    label: defaultLabelByKind[kind],
    width: DEFAULT_NODE_WIDTH,
    x: 120 + column * 230,
    y: 120 + row * 150,
  };
};

export const normalizeSystemDesignDiagram = (
  value: unknown,
): SystemDesignDiagram | null => {
  if (!isRecord(value)) {
    return null;
  }

  const rawNodes = Array.isArray(value.nodes) ? value.nodes : [];
  const nodes = rawNodes
    .filter(isRecord)
    .map<SystemDesignDiagramNode | null>((node, index) => {
      if (typeof node.id !== "string" || !isNodeKind(node.kind)) {
        return null;
      }

      return {
        height: clampNumber(node.height, DEFAULT_NODE_HEIGHT, 52, 180),
        id: node.id,
        kind: node.kind,
        label: normalizeLabel(node.label, defaultLabelByKind[node.kind]),
        width: clampNumber(node.width, DEFAULT_NODE_WIDTH, 104, 260),
        x: clampNumber(
          node.x,
          120 + index * 32,
          MIN_COORDINATE,
          MAX_COORDINATE,
        ),
        y: clampNumber(
          node.y,
          120 + index * 32,
          MIN_COORDINATE,
          MAX_COORDINATE,
        ),
      };
    })
    .filter((node): node is SystemDesignDiagramNode => node !== null);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const rawConnectors = Array.isArray(value.connectors) ? value.connectors : [];
  const connectors = rawConnectors
    .filter(isRecord)
    .map<SystemDesignDiagramConnector | null>((connector) => {
      if (
        typeof connector.id !== "string" ||
        typeof connector.fromNodeId !== "string" ||
        typeof connector.toNodeId !== "string" ||
        !nodeIds.has(connector.fromNodeId) ||
        !nodeIds.has(connector.toNodeId)
      ) {
        return null;
      }

      return {
        fromNodeId: connector.fromNodeId,
        id: connector.id,
        label: normalizeLabel(connector.label, ""),
        toNodeId: connector.toNodeId,
      };
    })
    .filter(
      (connector): connector is SystemDesignDiagramConnector =>
        connector !== null,
    );

  return {
    connectors,
    nodes,
  };
};

export const createSystemArchitectureTemplate = (): SystemDesignDiagram => {
  const nodes: SystemDesignDiagramNode[] = [
    {
      ...createDefaultSystemDesignNode("client", 0),
      id: "template-client",
      label: "Users / Clients",
      x: 70,
      y: 150,
    },
    {
      ...createDefaultSystemDesignNode("cdn", 1),
      id: "template-cdn",
      x: 270,
      y: 80,
    },
    {
      ...createDefaultSystemDesignNode("load-balancer", 2),
      id: "template-lb",
      x: 270,
      y: 220,
    },
    {
      ...createDefaultSystemDesignNode("api-gateway", 3),
      id: "template-api",
      x: 490,
      y: 150,
    },
    {
      ...createDefaultSystemDesignNode("service", 4),
      id: "template-service",
      label: "Core Service",
      x: 710,
      y: 150,
    },
    {
      ...createDefaultSystemDesignNode("cache", 5),
      id: "template-cache",
      x: 940,
      y: 55,
    },
    {
      ...createDefaultSystemDesignNode("database", 6),
      id: "template-db",
      x: 940,
      y: 165,
    },
    {
      ...createDefaultSystemDesignNode("queue", 7),
      id: "template-queue",
      x: 940,
      y: 285,
    },
    {
      ...createDefaultSystemDesignNode("worker", 8),
      id: "template-worker",
      x: 1160,
      y: 285,
    },
    {
      ...createDefaultSystemDesignNode("storage", 9),
      id: "template-storage",
      x: 1160,
      y: 165,
    },
  ];

  return {
    connectors: [
      {
        fromNodeId: "template-client",
        id: "template-edge-client-cdn",
        label: "static",
        toNodeId: "template-cdn",
      },
      {
        fromNodeId: "template-client",
        id: "template-edge-client-lb",
        label: "request",
        toNodeId: "template-lb",
      },
      {
        fromNodeId: "template-lb",
        id: "template-edge-lb-api",
        label: "",
        toNodeId: "template-api",
      },
      {
        fromNodeId: "template-api",
        id: "template-edge-api-service",
        label: "",
        toNodeId: "template-service",
      },
      {
        fromNodeId: "template-service",
        id: "template-edge-service-cache",
        label: "hot reads",
        toNodeId: "template-cache",
      },
      {
        fromNodeId: "template-service",
        id: "template-edge-service-db",
        label: "writes",
        toNodeId: "template-db",
      },
      {
        fromNodeId: "template-service",
        id: "template-edge-service-queue",
        label: "async jobs",
        toNodeId: "template-queue",
      },
      {
        fromNodeId: "template-queue",
        id: "template-edge-queue-worker",
        label: "",
        toNodeId: "template-worker",
      },
      {
        fromNodeId: "template-worker",
        id: "template-edge-worker-storage",
        label: "assets",
        toNodeId: "template-storage",
      },
    ],
    nodes,
  };
};

export const summarizeSystemDesignDiagram = (
  diagram: SystemDesignDiagram | null,
): string => {
  const normalizedDiagram = normalizeSystemDesignDiagram(diagram);

  if (!normalizedDiagram || normalizedDiagram.nodes.length === 0) {
    return "";
  }

  const nodesById = new Map(
    normalizedDiagram.nodes.map((node) => [node.id, node]),
  );
  const componentSummary = normalizedDiagram.nodes
    .map((node) => `${node.label} (${node.kind})`)
    .join(", ");
  const connectionSummary = normalizedDiagram.connectors
    .map((connector) => {
      const fromNode = nodesById.get(connector.fromNodeId);
      const toNode = nodesById.get(connector.toNodeId);

      if (!fromNode || !toNode) {
        return null;
      }

      const label = connector.label ? ` [${connector.label}]` : "";

      return `${fromNode.label} -> ${toNode.label}${label}`;
    })
    .filter((connection): connection is string => connection !== null)
    .join("; ");

  return [
    "Architecture diagram:",
    `Components: ${componentSummary}.`,
    connectionSummary ? `Connections: ${connectionSummary}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
};

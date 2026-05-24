export const systemDesignNodeKinds = [
  "dns",
  "client",
  "cdn",
  "firewall",
  "load-balancer",
  "api-gateway",
  "auth",
  "rate-limiter",
  "service",
  "service-discovery",
  "database",
  "cache",
  "queue",
  "stream",
  "worker",
  "scheduler",
  "search",
  "storage",
  "monitoring",
  "external",
] as const;

export type SystemDesignNodeKind = (typeof systemDesignNodeKinds)[number];

export const systemDesignConnectorKinds = [
  "one-way",
  "async",
  "bidirectional",
  "dependency",
  "plain",
] as const;

export type SystemDesignConnectorKind =
  (typeof systemDesignConnectorKinds)[number];

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
  kind: SystemDesignConnectorKind;
  label: string;
  toNodeId: string;
}

export interface SystemDesignDiagramViewport {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface SystemDesignDiagram {
  connectors: SystemDesignDiagramConnector[];
  nodes: SystemDesignDiagramNode[];
  viewport?: SystemDesignDiagramViewport | null;
}

const DEFAULT_NODE_WIDTH = 152;
const DEFAULT_NODE_HEIGHT = 76;
const DEFAULT_CONNECTOR_KIND: SystemDesignConnectorKind = "one-way";
const MAX_LABEL_LENGTH = 80;
const MIN_COORDINATE = -100000;
const MAX_COORDINATE = 100000;
const MIN_VIEWPORT_SIZE = 100;
const MAX_VIEWPORT_SIZE = 100000;

const defaultLabelByKind: Record<SystemDesignNodeKind, string> = {
  "api-gateway": "API Gateway",
  auth: "Auth Service",
  cache: "Cache",
  cdn: "CDN",
  client: "Client",
  database: "Primary DB",
  dns: "DNS",
  external: "External API",
  firewall: "Firewall / WAF",
  "load-balancer": "Load Balancer",
  monitoring: "Monitoring",
  queue: "Queue",
  "rate-limiter": "Rate Limiter",
  scheduler: "Scheduler",
  search: "Search Index",
  service: "Service",
  "service-discovery": "Service Discovery",
  storage: "Object Store",
  stream: "Event Stream",
  worker: "Worker",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNodeKind = (value: unknown): value is SystemDesignNodeKind =>
  typeof value === "string" &&
  systemDesignNodeKinds.includes(value as SystemDesignNodeKind);

const isConnectorKind = (value: unknown): value is SystemDesignConnectorKind =>
  typeof value === "string" &&
  systemDesignConnectorKinds.includes(value as SystemDesignConnectorKind);

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
  viewport: null,
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
        kind: isConnectorKind(connector.kind)
          ? connector.kind
          : DEFAULT_CONNECTOR_KIND,
        label: normalizeLabel(connector.label, ""),
        toNodeId: connector.toNodeId,
      };
    })
    .filter(
      (connector): connector is SystemDesignDiagramConnector =>
        connector !== null,
    );
  const viewport = isRecord(value.viewport)
    ? {
        height: clampNumber(
          value.viewport.height,
          860,
          MIN_VIEWPORT_SIZE,
          MAX_VIEWPORT_SIZE,
        ),
        width: clampNumber(
          value.viewport.width,
          1400,
          MIN_VIEWPORT_SIZE,
          MAX_VIEWPORT_SIZE,
        ),
        x: clampNumber(
          value.viewport.x,
          0,
          MIN_COORDINATE,
          MAX_COORDINATE,
        ),
        y: clampNumber(
          value.viewport.y,
          0,
          MIN_COORDINATE,
          MAX_COORDINATE,
        ),
      }
    : null;

  return {
    connectors,
    nodes,
    viewport,
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
        kind: "one-way",
        label: "static",
        toNodeId: "template-cdn",
      },
      {
        fromNodeId: "template-client",
        id: "template-edge-client-lb",
        kind: "one-way",
        label: "request",
        toNodeId: "template-lb",
      },
      {
        fromNodeId: "template-lb",
        id: "template-edge-lb-api",
        kind: "one-way",
        label: "",
        toNodeId: "template-api",
      },
      {
        fromNodeId: "template-api",
        id: "template-edge-api-service",
        kind: "one-way",
        label: "",
        toNodeId: "template-service",
      },
      {
        fromNodeId: "template-service",
        id: "template-edge-service-cache",
        kind: "bidirectional",
        label: "hot reads",
        toNodeId: "template-cache",
      },
      {
        fromNodeId: "template-service",
        id: "template-edge-service-db",
        kind: "one-way",
        label: "writes",
        toNodeId: "template-db",
      },
      {
        fromNodeId: "template-service",
        id: "template-edge-service-queue",
        kind: "async",
        label: "async jobs",
        toNodeId: "template-queue",
      },
      {
        fromNodeId: "template-queue",
        id: "template-edge-queue-worker",
        kind: "async",
        label: "",
        toNodeId: "template-worker",
      },
      {
        fromNodeId: "template-worker",
        id: "template-edge-worker-storage",
        kind: "one-way",
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
      const arrowByKind: Record<SystemDesignConnectorKind, string> = {
        async: "~>",
        bidirectional: "<->",
        dependency: "- depends on ->",
        "one-way": "->",
        plain: "--",
      };

      return `${fromNode.label} ${arrowByKind[connector.kind]} ${toNode.label}${label}`;
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

import { z } from "zod";

export const systemDesignNodeKindSchema = z.enum([
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
]);

export const systemDesignConnectorKindSchema = z.enum([
  "one-way",
  "async",
  "bidirectional",
  "dependency",
  "plain",
]);

export const systemDesignDiagramSchema = z.object({
  connectors: z
    .array(
      z.object({
        fromNodeId: z.string().trim().min(1),
        id: z.string().trim().min(1),
        kind: systemDesignConnectorKindSchema,
        label: z.string().max(80),
        toNodeId: z.string().trim().min(1),
      }),
    )
    .max(200),
  nodes: z
    .array(
      z.object({
        height: z.number().finite().min(52).max(180),
        id: z.string().trim().min(1),
        kind: systemDesignNodeKindSchema,
        label: z.string().trim().min(1).max(80),
        width: z.number().finite().min(104).max(260),
        x: z.number().finite().min(-100000).max(100000),
        y: z.number().finite().min(-100000).max(100000),
      }),
    )
    .max(100),
  viewport: z
    .object({
      height: z.number().finite().min(100).max(100000),
      width: z.number().finite().min(100).max(100000),
      x: z.number().finite().min(-100000).max(100000),
      y: z.number().finite().min(-100000).max(100000),
    })
    .nullable()
    .optional(),
});

export type SystemDesignDiagram = z.infer<typeof systemDesignDiagramSchema>;
export type SystemDesignDiagramConnector =
  SystemDesignDiagram["connectors"][number];
export type SystemDesignDiagramNode = SystemDesignDiagram["nodes"][number];
export type SystemDesignNodeKind = z.infer<typeof systemDesignNodeKindSchema>;
export type SystemDesignConnectorKind = z.infer<
  typeof systemDesignConnectorKindSchema
>;

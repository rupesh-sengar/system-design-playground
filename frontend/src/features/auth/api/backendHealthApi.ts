import { baseApi } from "@/shared/api/baseApi";

export type BackendHealthResponse = {
  auth: {
    audience: string | null;
    domain: string | null;
    enabled: boolean;
    requiredScopes: string[];
  };
  provider: {
    configured: boolean;
    model: string;
    orchestration: string;
    provider: string;
  };
  status: "ok";
};

export const backendHealthApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBackendHealth: builder.query<BackendHealthResponse, void>({
      query: () => "/healthz",
    }),
  }),
});

export const { useLazyGetBackendHealthQuery } = backendHealthApi;

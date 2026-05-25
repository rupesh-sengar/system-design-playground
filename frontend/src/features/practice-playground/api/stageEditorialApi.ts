import { baseApi } from "@/shared/api/baseApi";
import { getApiErrorDetails, requestJson } from "@/shared/api/http";
import type { PracticeStageId } from "../model/types";

export interface StageEditorial {
  contentHtml: string;
  createdAt: string;
  problemId: string;
  stageId: PracticeStageId;
  title: string;
  updatedAt: string;
}

type StageEditorialEnvelope = {
  data: StageEditorial | null;
};

type RtkQueryCustomError = {
  error: string;
  data: {
    error: string;
    kind: ReturnType<typeof getApiErrorDetails>["kind"];
    retryable: boolean;
    statusCode: number | null;
  };
  status: "CUSTOM_ERROR";
};

const toQueryError = (
  error: unknown,
  fallbackMessage: string,
): RtkQueryCustomError => {
  const details = getApiErrorDetails(error, fallbackMessage);

  return {
    error: details.message,
    data: {
      error: details.message,
      kind: details.kind,
      retryable: details.retryable,
      statusCode: details.statusCode,
    },
    status: "CUSTOM_ERROR",
  };
};

export const stageEditorialApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStageEditorial: builder.query<
      StageEditorial | null,
      {
        problemId: string;
        stageId: PracticeStageId;
      }
    >({
      providesTags: (_result, _error, arg) => [
        {
          id: `${arg.problemId}:${arg.stageId}`,
          type: "StageEditorial",
        },
      ],
      queryFn: async ({ problemId, stageId }) => {
        try {
          const response = await requestJson<StageEditorialEnvelope>(
            `/v1/editorials/${encodeURIComponent(
              problemId,
            )}/${encodeURIComponent(stageId)}`,
            {
              requiresAuth: true,
            },
          );

          return {
            data: response.data,
          };
        } catch (error) {
          return {
            error: toQueryError(error, "Unable to load the stage editorial."),
          };
        }
      },
    }),
    upsertStageEditorial: builder.mutation<
      StageEditorial,
      {
        contentHtml: string;
        problemId: string;
        stageId: PracticeStageId;
        title?: string;
      }
    >({
      invalidatesTags: (_result, _error, arg) => [
        {
          id: `${arg.problemId}:${arg.stageId}`,
          type: "StageEditorial",
        },
      ],
      queryFn: async ({ problemId, stageId, ...body }) => {
        try {
          const response = await requestJson<StageEditorialEnvelope>(
            `/v1/editorials/${encodeURIComponent(
              problemId,
            )}/${encodeURIComponent(stageId)}`,
            {
              body: JSON.stringify(body),
              method: "PUT",
              requiresAuth: true,
            },
          );

          if (!response.data) {
            return {
              error: toQueryError(
                new Error("Saved stage editorial response was empty."),
                "Unable to save the stage editorial.",
              ),
            };
          }

          return {
            data: response.data,
          };
        } catch (error) {
          return {
            error: toQueryError(error, "Unable to save the stage editorial."),
          };
        }
      },
    }),
  }),
});

export const {
  useGetStageEditorialQuery,
  useUpsertStageEditorialMutation,
} = stageEditorialApi;

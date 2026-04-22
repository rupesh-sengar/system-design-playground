import { baseApi } from "@/shared/api/baseApi";
import { getApiErrorDetails, requestJson } from "@/shared/api/http";

export interface ProblemProgressEntry {
  createdAt: string;
  isBookmarked: boolean;
  isPracticed: boolean;
  problemId: string;
  updatedAt: string;
}

type ProblemProgressEnvelope = {
  data: ProblemProgressEntry[];
};

type ProblemProgressRecordEnvelope = {
  data: ProblemProgressEntry;
};

type ResetProblemProgressEnvelope = {
  data: {
    reset: boolean;
  };
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

export const problemProgressApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProblemProgress: builder.query<ProblemProgressEntry[], void>({
      providesTags: [{ id: "LIST", type: "ProblemProgress" }],
      queryFn: async () => {
        try {
          const response = await requestJson<ProblemProgressEnvelope>(
            "/v1/persistence/problem-progress",
            {
              requiresAuth: true,
            },
          );

          return {
            data: response.data,
          };
        } catch (error) {
          return {
            error: toQueryError(error, "Unable to load saved progress."),
          };
        }
      },
    }),
    resetProblemProgress: builder.mutation<boolean, void>({
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          problemProgressApi.util.updateQueryData(
            "getProblemProgress",
            undefined,
            () => [],
          ),
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: [{ id: "LIST", type: "ProblemProgress" }],
      queryFn: async () => {
        try {
          const response = await requestJson<ResetProblemProgressEnvelope>(
            "/v1/persistence/problem-progress",
            {
              method: "DELETE",
              requiresAuth: true,
            },
          );

          return {
            data: response.data.reset,
          };
        } catch (error) {
          return {
            error: toQueryError(error, "Unable to reset saved progress."),
          };
        }
      },
    }),
    updateProblemProgress: builder.mutation<
      ProblemProgressEntry,
      {
        isBookmarked?: boolean;
        isPracticed?: boolean;
        problemId: string;
      }
    >({
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          problemProgressApi.util.updateQueryData(
            "getProblemProgress",
            undefined,
            (draft) => {
              const entryIndex = draft.findIndex(
                (entry) => entry.problemId === arg.problemId,
              );

              if (entryIndex === -1) {
                draft.unshift({
                  createdAt: new Date().toISOString(),
                  isBookmarked: arg.isBookmarked ?? false,
                  isPracticed: arg.isPracticed ?? false,
                  problemId: arg.problemId,
                  updatedAt: new Date().toISOString(),
                });
              } else {
                const entry = draft[entryIndex];

                if (!entry) {
                  return;
                }

                if (arg.isBookmarked !== undefined) {
                  entry.isBookmarked = arg.isBookmarked;
                }

                if (arg.isPracticed !== undefined) {
                  entry.isPracticed = arg.isPracticed;
                }

                entry.updatedAt = new Date().toISOString();

                if (!entry.isBookmarked && !entry.isPracticed) {
                  draft.splice(entryIndex, 1);
                }
              }
            },
          ),
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { id: "LIST", type: "ProblemProgress" },
        { id: arg.problemId, type: "ProblemProgress" },
      ],
      queryFn: async ({ problemId, ...body }) => {
        try {
          const response = await requestJson<ProblemProgressRecordEnvelope>(
            `/v1/persistence/problem-progress/${encodeURIComponent(problemId)}`,
            {
              body: JSON.stringify(body),
              method: "PUT",
              requiresAuth: true,
            },
          );

          return {
            data: response.data,
          };
        } catch (error) {
          return {
            error: toQueryError(error, "Unable to update saved progress."),
          };
        }
      },
    }),
  }),
});

export const {
  useGetProblemProgressQuery,
  useResetProblemProgressMutation,
  useUpdateProblemProgressMutation,
} = problemProgressApi;

import { baseApi } from "@/shared/api/baseApi";
import { getApiErrorDetails, requestJson } from "@/shared/api/http";
import type {
  PersistedPracticeSession,
  PersistedPracticeSessionInput,
} from "../lib/session";

type PracticeSessionEnvelope = {
  data: PersistedPracticeSession | null;
};

type ResetPracticeSessionEnvelope = {
  data: {
    deleted: boolean;
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

export const practiceSessionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    deletePracticeSession: builder.mutation<boolean, string>({
      async onQueryStarted(problemId, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          practiceSessionApi.util.updateQueryData(
            "getPracticeSession",
            problemId,
            () => null,
          ),
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (_result, _error, problemId) => [
        { id: problemId, type: "PracticeSession" },
      ],
      queryFn: async (problemId) => {
        try {
          const response = await requestJson<ResetPracticeSessionEnvelope>(
            `/v1/persistence/practice-sessions/${encodeURIComponent(problemId)}`,
            {
              method: "DELETE",
              requiresAuth: true,
            },
          );

          return {
            data: response.data.deleted,
          };
        } catch (error) {
          return {
            error: toQueryError(
              error,
              "Unable to reset saved playground notes.",
            ),
          };
        }
      },
    }),
    getPracticeSession: builder.query<PersistedPracticeSession | null, string>({
      providesTags: (_result, _error, problemId) => [
        { id: problemId, type: "PracticeSession" },
      ],
      queryFn: async (problemId) => {
        try {
          const response = await requestJson<PracticeSessionEnvelope>(
            `/v1/persistence/practice-sessions/${encodeURIComponent(problemId)}`,
            {
              requiresAuth: true,
            },
          );

          return {
            data: response.data,
          };
        } catch (error) {
          return {
            error: toQueryError(
              error,
              "Unable to load saved playground notes.",
            ),
          };
        }
      },
    }),
    upsertPracticeSession: builder.mutation<
      PersistedPracticeSession,
      {
        problemId: string;
        session: PersistedPracticeSessionInput;
      }
    >({
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            practiceSessionApi.util.upsertQueryData(
              "getPracticeSession",
              arg.problemId,
              data,
            ),
          );
        } catch {
          return;
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { id: arg.problemId, type: "PracticeSession" },
      ],
      queryFn: async ({ problemId, session }) => {
        try {
          const response = await requestJson<PracticeSessionEnvelope>(
            `/v1/persistence/practice-sessions/${encodeURIComponent(problemId)}`,
            {
              body: JSON.stringify(session),
              method: "PUT",
              requiresAuth: true,
            },
          );

          if (!response.data) {
            return {
              error: toQueryError(
                new Error("Saved practice session response was empty."),
                "Unable to save playground notes.",
              ),
            };
          }

          return {
            data: response.data,
          };
        } catch (error) {
          return {
            error: toQueryError(error, "Unable to save playground notes."),
          };
        }
      },
    }),
  }),
});

export const {
  useDeletePracticeSessionMutation,
  useGetPracticeSessionQuery,
  useUpsertPracticeSessionMutation,
} = practiceSessionApi;

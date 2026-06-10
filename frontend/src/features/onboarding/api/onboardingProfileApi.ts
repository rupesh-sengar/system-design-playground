import { baseApi } from "@/shared/api/baseApi";
import { getApiErrorDetails, requestJson } from "@/shared/api/http";

export interface OnboardingProfile {
  completedAt: string | null;
  experienceLevel: string | null;
  focusAreas: string[];
  interviewTimeline: string | null;
  targetRole: string | null;
  updatedAt: string;
}

export interface OnboardingProfileInput {
  experienceLevel: string | null;
  focusAreas: string[];
  interviewTimeline: string | null;
  targetRole: string | null;
}

type OnboardingProfileEnvelope = {
  data: OnboardingProfile | null;
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

export const onboardingProfileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOnboardingProfile: builder.query<OnboardingProfile | null, void>({
      providesTags: ["OnboardingProfile"],
      queryFn: async () => {
        try {
          const response = await requestJson<OnboardingProfileEnvelope>(
            "/v1/onboarding/me",
            {
              requiresAuth: true,
            },
          );

          return { data: response.data };
        } catch (error) {
          return {
            error: toQueryError(error, "Unable to load onboarding profile."),
          };
        }
      },
    }),
    updateOnboardingProfile: builder.mutation<
      OnboardingProfile,
      OnboardingProfileInput
    >({
      invalidatesTags: ["OnboardingProfile"],
      queryFn: async (body) => {
        try {
          const response = await requestJson<OnboardingProfileEnvelope>(
            "/v1/onboarding/me",
            {
              body: JSON.stringify(body),
              method: "PUT",
              requiresAuth: true,
            },
          );

          if (!response.data) {
            return {
              error: toQueryError(
                new Error("Saved onboarding profile response was empty."),
                "Unable to save onboarding profile.",
              ),
            };
          }

          return { data: response.data };
        } catch (error) {
          return {
            error: toQueryError(error, "Unable to save onboarding profile."),
          };
        }
      },
    }),
  }),
});

export const {
  useGetOnboardingProfileQuery,
  useUpdateOnboardingProfileMutation,
} = onboardingProfileApi;

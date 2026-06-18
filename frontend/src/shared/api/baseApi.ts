import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiBaseUrl } from "./http";

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: fetchBaseQuery({
    baseUrl: getApiBaseUrl(),
  }),
  tagTypes: [
    "BillingAccount",
    "BillingPlans",
    "OnboardingProfile",
    "ProblemProgress",
    "PracticeSession",
    "StageEditorial",
  ],
  endpoints: () => ({}),
});

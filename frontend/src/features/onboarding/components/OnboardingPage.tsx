import { ArrowRight, Check, Target } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useAppAuth } from "@/features/auth/app-auth";
import { getApiErrorMessage } from "@/shared/api/http";
import {
  useGetOnboardingProfileQuery,
  useUpdateOnboardingProfileMutation,
} from "../api/onboardingProfileApi";
import "./onboarding-page.css";

interface OnboardingPageProps {
  onOpenLibrary: () => void;
  onOpenPricing: () => void;
}

const roleOptions = [
  "Backend engineer",
  "Full-stack engineer",
  "Senior engineer",
  "Engineering manager",
  "Student",
];

const experienceOptions = [
  "Beginner",
  "Intermediate",
  "Senior",
  "Staff+",
];

const timelineOptions = [
  "This week",
  "2-4 weeks",
  "1-3 months",
  "No deadline",
];

const focusOptions = [
  "Requirements",
  "APIs",
  "Data modeling",
  "Scalability",
  "Reliability",
  "Tradeoffs",
  "Diagrams",
  "Deep dives",
];

const buildPathRecommendation = (input: {
  experienceLevel: string;
  focusAreas: string[];
  interviewTimeline: string;
  targetRole: string;
}): string => {
  if (
    input.targetRole.includes("Senior") ||
    input.experienceLevel === "Senior" ||
    input.experienceLevel === "Staff+"
  ) {
    return "Senior tradeoff path";
  }

  if (input.interviewTimeline === "This week") {
    return "Interview sprint path";
  }

  if (
    input.focusAreas.includes("Data modeling") ||
    input.focusAreas.includes("APIs")
  ) {
    return "Backend foundations path";
  }

  return "Core system design path";
};

export const OnboardingPage = ({
  onOpenLibrary,
  onOpenPricing,
}: OnboardingPageProps) => {
  const {
    canRequestApiToken,
    isApiAuthReady,
    isAuthenticated,
    isConfigured,
    isLoading,
    login,
  } = useAppAuth();
  const {
    data: profile,
    error: profileError,
    isFetching,
  } = useGetOnboardingProfileQuery(undefined, {
    skip: !isApiAuthReady,
  });
  const [updateProfile, updateProfileState] =
    useUpdateOnboardingProfileMutation();
  const [targetRole, setTargetRole] = useState(roleOptions[0]);
  const [experienceLevel, setExperienceLevel] = useState(experienceOptions[1]);
  const [interviewTimeline, setInterviewTimeline] = useState(timelineOptions[1]);
  const [focusAreas, setFocusAreas] = useState<string[]>([
    "Requirements",
    "Scalability",
  ]);
  const profileErrorMessage = profileError
    ? getApiErrorMessage(profileError, "Unable to load onboarding profile.")
    : null;
  const saveErrorMessage = updateProfileState.error
    ? getApiErrorMessage(
        updateProfileState.error,
        "Unable to save onboarding profile.",
      )
    : null;
  const pathRecommendation = useMemo(
    () =>
      buildPathRecommendation({
        experienceLevel,
        focusAreas,
        interviewTimeline,
        targetRole,
      }),
    [experienceLevel, focusAreas, interviewTimeline, targetRole],
  );

  useEffect(() => {
    if (!profile) {
      return;
    }

    setTargetRole(profile.targetRole ?? roleOptions[0]);
    setExperienceLevel(profile.experienceLevel ?? experienceOptions[1]);
    setInterviewTimeline(profile.interviewTimeline ?? timelineOptions[1]);
    setFocusAreas(
      profile.focusAreas.length > 0
        ? profile.focusAreas
        : ["Requirements", "Scalability"],
    );
  }, [profile]);

  const toggleFocusArea = (focusArea: string): void => {
    setFocusAreas((current) => {
      if (current.includes(focusArea)) {
        return current.filter((value) => value !== focusArea);
      }

      return [...current, focusArea];
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!isConfigured || !isAuthenticated) {
      await login({
        intent: "signup",
        returnToHash: "#/onboarding",
      });
      return;
    }

    if (!isApiAuthReady) {
      return;
    }

    await updateProfile({
      experienceLevel,
      focusAreas,
      interviewTimeline,
      targetRole,
    }).unwrap();
    onOpenLibrary();
  };

  if (!isConfigured || !canRequestApiToken) {
    return (
      <main className="onboarding-page">
        <section className="onboarding-empty">
          <Target aria-hidden="true" size={28} strokeWidth={1.8} />
          <h1>Setup</h1>
          <p>Auth0 and API audience configuration are required for onboarding.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="onboarding-page">
      <section className="onboarding-head">
        <div>
          <p className="eyebrow">Setup</p>
          <h1>Build a starter path</h1>
          <p>
            Save the role, timeline, and focus areas that should shape the first
            practice run.
          </p>
        </div>
        <button className="secondary-action" type="button" onClick={onOpenPricing}>
          View plans
        </button>
      </section>

      {profileErrorMessage ? (
        <div className="onboarding-notice onboarding-notice--error">
          {profileErrorMessage}
        </div>
      ) : null}
      {saveErrorMessage ? (
        <div className="onboarding-notice onboarding-notice--error">
          {saveErrorMessage}
        </div>
      ) : null}

      <form className="onboarding-form" onSubmit={(event) => void handleSubmit(event)}>
        <section className="onboarding-panel">
          <label className="onboarding-field">
            <span>Target role</span>
            <select
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value)}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <label className="onboarding-field">
            <span>Experience level</span>
            <select
              value={experienceLevel}
              onChange={(event) => setExperienceLevel(event.target.value)}
            >
              {experienceOptions.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>

          <label className="onboarding-field">
            <span>Interview timeline</span>
            <select
              value={interviewTimeline}
              onChange={(event) => setInterviewTimeline(event.target.value)}
            >
              {timelineOptions.map((timeline) => (
                <option key={timeline} value={timeline}>
                  {timeline}
                </option>
              ))}
            </select>
          </label>

          <section className="onboarding-focus" aria-label="Focus areas">
            <span>Focus areas</span>
            <div className="onboarding-focus__grid">
              {focusOptions.map((focusArea) => {
                const isSelected = focusAreas.includes(focusArea);

                return (
                  <button
                    key={focusArea}
                    className={`onboarding-focus__option ${
                      isSelected ? "onboarding-focus__option--selected" : ""
                    }`}
                    type="button"
                    onClick={() => toggleFocusArea(focusArea)}
                  >
                    {isSelected ? (
                      <Check aria-hidden="true" size={14} strokeWidth={2} />
                    ) : null}
                    {focusArea}
                  </button>
                );
              })}
            </div>
          </section>
        </section>

        <aside className="onboarding-summary">
          <div className="onboarding-summary__icon">
            <Target aria-hidden="true" size={20} strokeWidth={2} />
          </div>
          <span>Recommended path</span>
          <strong>{pathRecommendation}</strong>
          <p>
            {focusAreas.slice(0, 3).join(", ")}
            {focusAreas.length > 3 ? " and more" : ""} will be emphasized in
            practice selection and feedback prompts.
          </p>
          <button
            className="primary-action onboarding-summary__action"
            disabled={isLoading || isFetching || updateProfileState.isLoading}
            type="submit"
          >
            {isAuthenticated ? "Save setup" : "Sign up and save"}
            <ArrowRight aria-hidden="true" size={16} strokeWidth={2} />
          </button>
        </aside>
      </form>
    </main>
  );
};

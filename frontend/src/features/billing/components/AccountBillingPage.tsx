import {
  ArrowRight,
  Check,
  CreditCard,
  FileText,
  Gauge,
  KeyRound,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAppAuth } from "@/features/auth/app-auth";
import {
  useGetOnboardingProfileQuery,
  useUpdateOnboardingProfileMutation,
} from "@/features/onboarding/api/onboardingProfileApi";
import { getApiErrorMessage } from "@/shared/api/http";
import { useToast } from "@/shared/toast/toast-provider";
import { useGetBillingAccountQuery } from "../api/billingApi";
import "./AccountBillingPage.css";

interface AccountBillingPageProps {
  isBillingEnabled: boolean;
  onClose: () => void;
  onOpenPricing: () => void;
}

type AccountSectionId =
  | "general"
  | "profile"
  | "setup"
  | "billing"
  | "usage"
  | "subscription"
  | "privacy"
  | "terms";

interface AccountNavigationItem {
  icon: LucideIcon;
  id: AccountSectionId;
  label: string;
}

interface AccountRowProps {
  action?: ReactNode;
  detail?: string;
  icon?: ReactNode;
  label: string;
  meta?: ReactNode;
  value: ReactNode;
}

interface LegalDocumentSection {
  body?: string[];
  items?: string[];
  title: string;
}

const accountNavigation: AccountNavigationItem[] = [
  {
    icon: Settings,
    id: "general",
    label: "General",
  },
  {
    icon: UserRound,
    id: "profile",
    label: "Profile",
  },
  {
    icon: Target,
    id: "setup",
    label: "Setup",
  },
  {
    icon: CreditCard,
    id: "billing",
    label: "Billing",
  },
  {
    icon: Gauge,
    id: "usage",
    label: "Usage",
  },
  {
    icon: ShieldCheck,
    id: "subscription",
    label: "Subscription",
  },
  {
    icon: FileText,
    id: "privacy",
    label: "Privacy",
  },
  {
    icon: ScrollText,
    id: "terms",
    label: "Terms",
  },
];

const legalEffectiveDate = "June 29, 2026";
const legalOperatorName = "System Design Park";
const legalOperatorDescription =
  "System Design Park is operated by an individual developer";
const legalContactChannel =
  "the in-app issue reporting flow or the contact channel published in the application";

const privacyPolicySections: LegalDocumentSection[] = [
  {
    title: "1. Who we are",
    body: [
      `${legalOperatorDescription} ("${legalOperatorName}", "we", "us", or "our").`,
      "This Privacy Policy explains how we collect, use, disclose, retain, and protect information when you use our application, website, APIs, practice workspace, AI review features, billing flows, support channels, and issue reporting tools.",
    ],
  },
  {
    title: "2. Information we collect",
    items: [
      "Account information: name, email address, username, profile image, authentication provider identifiers, and login/session metadata supplied through Auth0 or any replacement identity provider.",
      "Profile and setup information: target role, experience level, interview timeline, focus areas, onboarding preferences, saved account settings, and similar information you provide in Account settings.",
      "Practice workspace content: problem progress, bookmarks, started/practiced state, notes, diagrams, stage completion state, generated hints, AI validation responses, and source drafts submitted for review.",
      "Billing information: plan tier, entitlement state, subscription identifiers, checkout status, billing period metadata, usage quotas, payment verification metadata, and payment provider references. We do not intentionally store full card numbers.",
      "AI and usage information: prompts, answers, rubric feedback, credit usage, request timestamps, error details, model/provider metadata, and feature usage events needed to operate usage limits and improve reliability.",
      "Issue reports and support information: report category, title, description, contact details you provide, page path, route context, device/browser metadata, screenshots or attachments if we later support them, and follow-up communications.",
      "Technical information: IP address, browser type, device information, operating system, timezone, language, request logs, security logs, cookies or local storage values, diagnostics, crash data, and approximate location inferred from network data.",
    ],
  },
  {
    title: "3. How we use information",
    items: [
      "Provide, operate, maintain, secure, debug, and improve the application.",
      "Authenticate users, create and maintain accounts, sync saved work, and prevent unauthorized access.",
      "Personalize practice workflows, recommendations, onboarding paths, AI hints, AI reviews, and product settings.",
      "Process subscriptions, apply entitlements, manage quotas, verify payments, prevent fraud, and provide billing support.",
      "Respond to support requests, issue reports, security notices, and administrative messages.",
      "Monitor service health, measure product usage, enforce rate limits, detect abuse, and protect the rights, safety, and integrity of users and the service.",
      "Comply with legal obligations, enforce our Terms, resolve disputes, preserve evidence, and respond to lawful requests.",
    ],
  },
  {
    title: "4. Legal bases and consent",
    body: [
      "Where applicable privacy law requires a legal basis, we process personal information to perform our contract with you, comply with legal obligations, pursue legitimate interests such as security and service improvement, protect vital interests, and rely on consent where required.",
      "You may withdraw consent where processing depends on consent, but withdrawal does not affect processing that occurred before withdrawal or processing permitted under another lawful basis.",
    ],
  },
  {
    title: "5. How we share information",
    items: [
      "Service providers and processors: identity providers, hosting providers, database providers, observability providers, payment processors, AI providers, email/support providers, and security vendors that process information for us under appropriate obligations.",
      "Payment partners: Razorpay or successor payment providers may process payment and subscription information under their own terms and policies.",
      "AI providers: practice drafts, diagrams, prompts, and related context may be sent to AI providers when you request AI-assisted features.",
      "Legal and safety disclosures: we may disclose information when required by law, court order, government request, security investigation, fraud prevention, or to protect rights, safety, and property.",
      "Business transfers: information may be disclosed or transferred as part of a merger, acquisition, financing, reorganization, sale of assets, or similar transaction.",
      "Aggregated or de-identified information: we may use and share information that does not reasonably identify you for analytics, research, product development, and business reporting.",
    ],
  },
  {
    title: "6. Data retention",
    body: [
      "We keep personal information for as long as needed to provide the service, maintain your account, comply with legal obligations, resolve disputes, enforce agreements, protect security, and maintain appropriate business records.",
      "Practice content and account settings are retained while your account is active unless deleted earlier through product controls or a verified request. Billing, security, tax, and audit records may be retained for longer periods where legally or operationally required.",
    ],
  },
  {
    title: "7. Security",
    body: [
      "We use administrative, technical, and organizational safeguards designed to protect information against unauthorized access, loss, misuse, alteration, and disclosure. These safeguards may include access controls, encryption in transit, limited access to production systems, logging, monitoring, and vendor review.",
      "No internet service can guarantee absolute security. You are responsible for maintaining the confidentiality of your login credentials and for promptly notifying us of suspected unauthorized access.",
    ],
  },
  {
    title: "8. International transfers",
    body: [
      "Your information may be processed and stored in countries other than your country of residence. Where required, we use appropriate safeguards for international transfers, such as contractual protections, approved transfer mechanisms, or other lawful bases.",
    ],
  },
  {
    title: "9. Your rights and choices",
    items: [
      "Access, correct, update, or delete certain account information through the application where controls are available.",
      "Request access, correction, deletion, restriction, objection, portability, withdrawal of consent, or grievance redressal where applicable law grants those rights.",
      "Request information about categories of personal data processed, purposes of processing, categories of recipients, and retention criteria where required.",
      "Opt out of non-essential communications by using unsubscribe controls where available. Service, security, billing, and account notices may still be sent.",
      `Submit requests through ${legalContactChannel}. We may verify your identity before acting on a request and may decline requests where permitted by law.`,
    ],
  },
  {
    title: "10. Children",
    body: [
      "The service is intended for users who are at least 18 years old or the age of majority in their jurisdiction. We do not knowingly collect personal information from children. If you believe a child provided personal information, contact us so we can take appropriate action.",
    ],
  },
  {
    title: "11. Cookies, local storage, and similar technologies",
    body: [
      "We may use cookies, local storage, session storage, and similar technologies for authentication, preferences, feature flags, security, saved local state, analytics, and performance. Browser controls may allow you to block or delete these technologies, but some features may stop working.",
    ],
  },
  {
    title: "12. Changes to this Privacy Policy",
    body: [
      "We may update this Privacy Policy from time to time. If changes are material, we will provide notice through the application, email, or another reasonable method. The updated policy becomes effective when posted unless a later effective date is stated.",
    ],
  },
  {
    title: "13. Contact and grievance redressal",
    body: [
      `Questions, requests, complaints, privacy grievances, and legal notices should be submitted through ${legalContactChannel}.`,
    ],
  },
];

const termsOfUseSections: LegalDocumentSection[] = [
  {
    title: "1. Agreement to these Terms",
    body: [
      `These Terms of Use ("Terms") are a binding agreement between you and ${legalOperatorName}, which is operated by an individual developer. By creating an account, accessing the service, using free or paid features, submitting content, or clicking an acceptance control where presented, you agree to these Terms.`,
      "If you use the service on behalf of an organization, you represent that you have authority to bind that organization, and references to \"you\" include that organization.",
    ],
  },
  {
    title: "2. Eligibility and accounts",
    items: [
      "You must be at least 18 years old or the age of majority in your jurisdiction.",
      "You must provide accurate account information and keep it up to date.",
      "You are responsible for all activity under your account and for safeguarding your credentials.",
      "You must promptly notify us of unauthorized access, suspected compromise, or misuse of your account.",
    ],
  },
  {
    title: "3. Service description",
    body: [
      "System Design Park provides system design practice workflows, problem libraries, note-taking, diagramming, AI-assisted hints, AI validation, editorials, progress tracking, usage limits, subscription plans, billing features, account settings, support, and issue reporting.",
      "We may add, change, suspend, remove, or limit features at any time, including during development preview periods.",
    ],
  },
  {
    title: "4. Educational and AI-generated content",
    items: [
      "The service is for educational and interview-preparation purposes only.",
      "AI-generated hints, reviews, scores, rubrics, suggestions, explanations, and examples may be incomplete, inaccurate, outdated, or unsuitable for your situation.",
      "You are responsible for reviewing outputs, applying independent judgment, and verifying information before relying on it.",
      "The service does not provide legal, financial, employment, professional engineering certification, hiring, or career-placement advice.",
    ],
  },
  {
    title: "5. User content",
    body: [
      "You retain ownership of notes, diagrams, answers, prompts, issue reports, feedback, and other content you submit, subject to the rights you grant us in these Terms.",
      "You grant us a worldwide, non-exclusive, royalty-free license to host, store, reproduce, process, transmit, display, modify for formatting, analyze, and otherwise use your content as needed to provide, secure, troubleshoot, support, and improve the service.",
      "You represent that you have the rights needed to submit your content and that your content does not violate law, third-party rights, confidentiality obligations, or these Terms.",
    ],
  },
  {
    title: "6. Acceptable use",
    items: [
      "Do not use the service unlawfully, deceptively, abusively, or in a way that harms users, us, or third parties.",
      "Do not attempt to gain unauthorized access, probe, scan, bypass authentication, interfere with rate limits, disrupt infrastructure, reverse engineer restricted systems, or exfiltrate data.",
      "Do not submit malware, secrets you are not authorized to share, regulated sensitive data not requested by the service, confidential employer/client materials, or personal data of others without a lawful basis.",
      "Do not use the service to generate harmful instructions, infringing content, spam, harassment, or content that violates applicable law.",
      "Do not resell, sublicense, scrape, benchmark for competitive purposes where prohibited, or use automated access beyond published interfaces without written permission.",
    ],
  },
  {
    title: "7. Plans, payments, renewals, and refunds",
    items: [
      "Free and paid plans may have different catalog access, AI quotas, sync features, editorials, and other entitlements.",
      "Paid subscriptions are processed through Razorpay or another payment provider. Payment providers may require their own terms and privacy notices.",
      "Unless otherwise stated at checkout, subscriptions may renew automatically for the selected billing interval until canceled.",
      "Plan changes, cancellations, renewals, failed payments, taxes, and refunds are governed by the checkout terms presented at purchase and applicable law.",
      "We may change plan features, prices, quotas, or billing terms prospectively with reasonable notice where required.",
    ],
  },
  {
    title: "8. Intellectual property",
    body: [
      "The service, software, user interface, design, problem library, rubrics, editorials, branding, trademarks, and other materials are owned by us or our licensors and are protected by intellectual property laws.",
      "Subject to your compliance with these Terms, we grant you a limited, revocable, non-exclusive, non-transferable license to access and use the service for personal or internal interview-preparation purposes.",
    ],
  },
  {
    title: "9. Third-party services",
    body: [
      "The service may rely on or link to third-party services such as Auth0, Razorpay, hosting providers, AI providers, analytics, and support tools. We are not responsible for third-party services, and your use of them may be subject to separate terms and policies.",
    ],
  },
  {
    title: "10. Suspension and termination",
    body: [
      "We may suspend or terminate access if you violate these Terms, create risk for the service or other users, fail to pay amounts due, or where required by law. You may stop using the service at any time. Certain provisions survive termination, including payment obligations, licenses needed for prior operation, disclaimers, limitations of liability, and dispute terms.",
    ],
  },
  {
    title: "11. Disclaimers",
    body: [
      "The service is provided on an \"as is\" and \"as available\" basis. To the maximum extent permitted by law, we disclaim all warranties, whether express, implied, statutory, or otherwise, including warranties of merchantability, fitness for a particular purpose, title, non-infringement, availability, accuracy, security, and uninterrupted operation.",
      "We do not guarantee that practice outcomes, AI feedback, scores, editorials, or recommendations will improve interview results, hiring outcomes, compensation, promotion, or professional performance.",
    ],
  },
  {
    title: "12. Limitation of liability",
    body: [
      "To the maximum extent permitted by law, we will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, lost revenue, lost data, loss of goodwill, business interruption, or substitute services.",
      "To the maximum extent permitted by law, our aggregate liability for all claims relating to the service will not exceed the amounts you paid to us for the service in the three months before the event giving rise to the claim, or INR 1,000 if you did not pay us during that period.",
    ],
  },
  {
    title: "13. Indemnity",
    body: [
      "You agree to indemnify and hold harmless System Design Park, its individual operator, contractors, service providers, and agents from claims, damages, liabilities, losses, and expenses arising from your content, your use of the service, your violation of these Terms, or your violation of law or third-party rights.",
    ],
  },
  {
    title: "14. Changes to the service or Terms",
    body: [
      "We may update these Terms from time to time. If changes are material, we will provide notice through the application, email, or another reasonable method. Continued use after the effective date means you accept the updated Terms.",
    ],
  },
  {
    title: "15. Governing law and disputes",
    body: [
      "The governing law, venue, arbitration, consumer-law carveouts, and dispute-resolution terms must be finalized based on the legal entity, customer locations, and launch jurisdiction. Until finalized, disputes will be handled under applicable law and competent courts determined by law.",
    ],
  },
  {
    title: "16. Contact",
    body: [
      `Questions about these Terms and legal notices should be submitted through ${legalContactChannel}.`,
    ],
  },
];

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

const formatDate = (value: string | null): string => {
  if (!value) {
    return "Not scheduled";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Not scheduled";
  }

  return parsed.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatValueLabel = (value: string): string =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");

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

const buildInitials = (value: string | null): string => {
  if (!value) {
    return "SD";
  }

  const tokens = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return "SD";
  }

  return tokens.map((token) => token.charAt(0).toUpperCase()).join("");
};

const AccountRow = ({
  action,
  detail,
  icon,
  label,
  meta,
  value,
}: AccountRowProps) => (
  <div className="account-row">
    {icon ? <span className="account-row__icon">{icon}</span> : null}
    <div className="account-row__copy">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </div>
    {meta || action ? (
      <div className="account-row__aside">
        {meta}
        {action}
      </div>
    ) : null}
  </div>
);

const LegalDocument = ({
  sections,
  title,
}: {
  sections: LegalDocumentSection[];
  title: string;
}) => (
  <article className="account-legal-document">
    <header className="account-legal-document__header">
      <span>Effective {legalEffectiveDate}</span>
      <h3>{title}</h3>
      <p>
        These terms apply to your access to and use of System Design Park and
        related services.
      </p>
    </header>

    <div className="account-legal-document__content">
      {sections.map((section) => (
        <section key={section.title} className="account-legal-section">
          <h4>{section.title}</h4>
          {section.body?.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.items ? (
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  </article>
);

export const AccountBillingPage = ({
  isBillingEnabled,
  onClose,
  onOpenPricing,
}: AccountBillingPageProps) => {
  const {
    canRequestApiToken,
    isApiAuthReady,
    isAuthenticated,
    isConfigured,
    isLoading,
    login,
    userEmail,
    userName,
    userPicture,
  } = useAppAuth();
  const toast = useToast();
  const [activeSectionId, setActiveSectionId] =
    useState<AccountSectionId>("general");
  const [targetRole, setTargetRole] = useState(roleOptions[0]);
  const [experienceLevel, setExperienceLevel] = useState(experienceOptions[1]);
  const [interviewTimeline, setInterviewTimeline] = useState(timelineOptions[1]);
  const [focusAreas, setFocusAreas] = useState<string[]>([
    "Requirements",
    "Scalability",
  ]);
  const {
    data: billingAccount,
    error: billingError,
    isFetching,
  } = useGetBillingAccountQuery(undefined, {
    skip: !isBillingEnabled || !isApiAuthReady,
  });
  const {
    data: onboardingProfile,
    error: onboardingProfileError,
    isFetching: isOnboardingProfileFetching,
  } = useGetOnboardingProfileQuery(undefined, {
    skip: !isApiAuthReady,
  });
  const [updateOnboardingProfile, updateOnboardingProfileState] =
    useUpdateOnboardingProfileMutation();
  const availableNavigation = useMemo(
    () =>
      isBillingEnabled
        ? accountNavigation
        : accountNavigation.filter(
            (item) =>
              item.id !== "billing" &&
              item.id !== "usage" &&
              item.id !== "subscription",
          ),
    [isBillingEnabled],
  );
  const usage = billingAccount?.usage.monthlyAi;
  const usagePercent = useMemo(() => {
    if (!usage || usage.limit === 0) {
      return 0;
    }

    return Math.min(100, Math.round((usage.used / usage.limit) * 100));
  }, [usage]);
  const billingErrorMessage = isBillingEnabled && billingError
    ? getApiErrorMessage(billingError, "Unable to load billing account.")
    : null;
  const onboardingProfileErrorMessage = onboardingProfileError
    ? getApiErrorMessage(
        onboardingProfileError,
        "Unable to load setup preferences.",
      )
    : null;
  const setupSaveErrorMessage = updateOnboardingProfileState.error
    ? getApiErrorMessage(
        updateOnboardingProfileState.error,
        "Unable to save setup preferences.",
      )
    : null;
  const displayName = userName ?? userEmail ?? "Signed in";
  const planLabel = billingAccount
    ? formatValueLabel(billingAccount.plan.tier)
    : isFetching
      ? "Loading"
      : "Unavailable";
  const planStateLabel = billingAccount?.plan.isPaid ? "Paid" : "Free";
  const planSourceLabel = billingAccount
    ? formatValueLabel(billingAccount.plan.source)
    : isFetching
      ? "Loading"
      : "Unavailable";
  const subscription = billingAccount?.subscription;
  const subscriptionStatusLabel = subscription?.status
    ? formatValueLabel(subscription.status)
    : billingAccount
      ? "Free"
      : isFetching
        ? "Loading"
        : "Unavailable";
  const activeNavigationItem =
    availableNavigation.find((item) => item.id === activeSectionId) ??
    availableNavigation[0];
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
    if (!onboardingProfile) {
      return;
    }

    setTargetRole(onboardingProfile.targetRole ?? roleOptions[0]);
    setExperienceLevel(
      onboardingProfile.experienceLevel ?? experienceOptions[1],
    );
    setInterviewTimeline(
      onboardingProfile.interviewTimeline ?? timelineOptions[1],
    );
    setFocusAreas(
      onboardingProfile.focusAreas.length > 0
        ? onboardingProfile.focusAreas
        : ["Requirements", "Scalability"],
    );
  }, [onboardingProfile]);

  useEffect(() => {
    if (availableNavigation.some((item) => item.id === activeSectionId)) {
      return;
    }

    setActiveSectionId("general");
  }, [activeSectionId, availableNavigation]);

  const toggleFocusArea = (focusArea: string): void => {
    setFocusAreas((currentFocusAreas) => {
      if (currentFocusAreas.includes(focusArea)) {
        return currentFocusAreas.filter((value) => value !== focusArea);
      }

      return [...currentFocusAreas, focusArea];
    });
  };

  const handleSaveSetup = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    try {
      await updateOnboardingProfile({
        experienceLevel,
        focusAreas,
        interviewTimeline,
        targetRole,
      }).unwrap();
      toast.success("Setup preferences were updated.", {
        title: "Setup saved",
      });
    } catch {
      return;
    }
  };

  const renderFrame = (children: ReactNode) => (
    <main className="account-page">
      <section className="account-shell" aria-label="Account settings">
        {children}
      </section>
    </main>
  );

  const renderUnauthenticatedState = (
    title: string,
    description: string,
    action?: ReactNode,
  ) =>
    renderFrame(
      <section className="account-empty">
        <CreditCard aria-hidden="true" size={22} strokeWidth={1.9} />
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {action}
      </section>,
    );

  if (!isConfigured || !canRequestApiToken) {
    return renderUnauthenticatedState(
      "Account unavailable",
      "Auth0 and API audience configuration are required for account settings.",
    );
  }

  if (!isAuthenticated) {
    return renderUnauthenticatedState(
      "Sign in required",
      isBillingEnabled
        ? "Sign in to view account settings, plan state, usage, subscription period, and billing controls."
        : "Sign in to view account settings, profile details, and setup preferences.",
      <button
        className="account-button account-button--primary"
        disabled={isLoading}
        type="button"
        onClick={() =>
          void login({
            returnToHash: "#/account",
          })
        }
      >
        Sign in
      </button>,
    );
  }

  const renderGeneralSection = () => (
    <>
      <section className="account-content-section">
        <h3>Account</h3>
        <AccountRow
          detail="Primary application account."
          icon={<Settings aria-hidden="true" size={18} strokeWidth={2} />}
          label="Workspace"
          value="System Design Park"
        />
        <AccountRow
          detail={
            isBillingEnabled
              ? "Used for billing, saved work, and account recovery."
              : "Used for saved work and account recovery."
          }
          icon={<UserRound aria-hidden="true" size={18} strokeWidth={2} />}
          label="Signed in as"
          value={displayName}
        />
        <AccountRow
          action={
            <button
              className="account-button"
              type="button"
              onClick={() => setActiveSectionId("setup")}
            >
              Edit setup
            </button>
          }
          detail="Interview preferences and onboarding details."
          icon={<KeyRound aria-hidden="true" size={18} strokeWidth={2} />}
          label="Setup"
          value={onboardingProfile?.completedAt ? "Configured" : "Not set"}
        />
      </section>
    </>
  );

  const renderProfileSection = () => (
    <section className="account-content-section">
      <h3>Profile</h3>
      <div className="account-profile-row">
        <span className="account-profile-avatar">
          {userPicture ? (
            <img alt="" src={userPicture} />
          ) : (
            buildInitials(userName ?? userEmail)
          )}
        </span>
        <div className="account-row__copy">
          <span>Public profile</span>
          <strong>{displayName}</strong>
          <p>{userEmail ?? "No email available"}</p>
        </div>
      </div>
      <AccountRow label="Display name" value={userName ?? "Not provided"} />
      <AccountRow label="Email" value={userEmail ?? "Not provided"} />
    </section>
  );

  const renderSetupSection = () => (
    <form
      className="account-content-section account-setup"
      onSubmit={(event) => void handleSaveSetup(event)}
    >
      <h3>Setup</h3>

      {onboardingProfileErrorMessage ? (
        <div className="account-notice account-notice--error">
          {onboardingProfileErrorMessage}
        </div>
      ) : null}
      {setupSaveErrorMessage ? (
        <div className="account-notice account-notice--error">
          {setupSaveErrorMessage}
        </div>
      ) : null}

      <div className="account-setup-grid">
        <label className="account-field">
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

        <label className="account-field">
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

        <label className="account-field">
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
      </div>

      <section className="account-focus" aria-label="Focus areas">
        <span>Focus areas</span>
        <div className="account-focus__grid">
          {focusOptions.map((focusArea) => {
            const isSelected = focusAreas.includes(focusArea);

            return (
              <button
                key={focusArea}
                className={`account-focus__option ${
                  isSelected ? "account-focus__option--selected" : ""
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

      <div className="account-setup-summary">
        <span className="account-row__icon">
          <Target aria-hidden="true" size={18} strokeWidth={2} />
        </span>
        <div className="account-row__copy">
          <span>Recommended path</span>
          <strong>{pathRecommendation}</strong>
          <p>
            {focusAreas.slice(0, 3).join(", ")}
            {focusAreas.length > 3 ? " and more" : ""} will be emphasized in
            practice selection and feedback prompts.
          </p>
        </div>
        <button
          className="account-button account-button--primary"
          disabled={
            isOnboardingProfileFetching ||
            updateOnboardingProfileState.isLoading
          }
          type="submit"
        >
          {updateOnboardingProfileState.isLoading ? "Saving" : "Save setup"}
        </button>
      </div>
    </form>
  );

  const renderBillingSection = () => (
    <section className="account-content-section">
      <h3>Billing</h3>
      <AccountRow
        action={
          <button
            className="account-button account-button--primary"
            disabled={isFetching}
            type="button"
            onClick={onOpenPricing}
          >
            Change plan
            <ArrowRight aria-hidden="true" size={15} strokeWidth={2} />
          </button>
        }
        detail={
          billingAccount?.plan.isPaid
            ? "Paid features are active for this account."
            : "Free tier limits are active for this account."
        }
        icon={<CreditCard aria-hidden="true" size={18} strokeWidth={2} />}
        label="Current plan"
        meta={
          <span
            className={`account-status ${
              billingAccount?.plan.isPaid
                ? "account-status--paid"
                : "account-status--free"
            }`}
          >
            {planStateLabel}
          </span>
        }
        value={planLabel}
      />
      <AccountRow label="Plan source" value={planSourceLabel} />
      <AccountRow label="Billing provider" value="Razorpay" />
    </section>
  );

  const renderUsageSection = () => (
    <section className="account-content-section">
      <h3>Usage</h3>
      <AccountRow
        detail={
          usage
            ? `${usage.remaining} remaining of ${usage.limit}`
            : "Usage data is not available yet."
        }
        icon={<Gauge aria-hidden="true" size={18} strokeWidth={2} />}
        label="Monthly AI"
        meta={
          <div className="account-usage">
            <span>{usagePercent}%</span>
            <div
              aria-label={`${usagePercent}% of monthly AI quota used`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={usagePercent}
              className="account-meter"
              role="meter"
            >
              <span style={{ width: `${usagePercent}%` }} />
            </div>
          </div>
        }
        value={
          usage
            ? `${usage.used} used`
            : isFetching
              ? "Loading"
              : "Unavailable"
        }
      />
      <AccountRow
        label="Quota limit"
        value={usage ? usage.limit : isFetching ? "Loading" : "Unavailable"}
      />
      <AccountRow
        label="Remaining"
        value={
          usage ? usage.remaining : isFetching ? "Loading" : "Unavailable"
        }
      />
    </section>
  );

  const renderSubscriptionSection = () => (
    <section className="account-content-section">
      <h3>Subscription</h3>
      <AccountRow
        icon={<Sparkles aria-hidden="true" size={18} strokeWidth={2} />}
        label="Status"
        meta={
          subscription?.cancelAtPeriodEnd ? (
            <span className="account-status account-status--warning">
              Cancels
            </span>
          ) : null
        }
        value={subscriptionStatusLabel}
      />
      <AccountRow
        label="Period start"
        value={formatDate(subscription?.currentPeriodStart ?? null)}
      />
      <AccountRow
        label="Period end"
        value={formatDate(subscription?.currentPeriodEnd ?? null)}
      />
      <AccountRow
        label="Razorpay subscription"
        value={subscription?.razorpaySubscriptionId ?? "Not available"}
      />
    </section>
  );

  const renderPrivacySection = () => (
    <LegalDocument sections={privacyPolicySections} title="Privacy Policy" />
  );

  const renderTermsSection = () => (
    <LegalDocument sections={termsOfUseSections} title="Terms of Use" />
  );

  const renderActiveSection = () => {
    if (activeSectionId === "profile") {
      return renderProfileSection();
    }

    if (activeSectionId === "setup") {
      return renderSetupSection();
    }

    if (activeSectionId === "billing") {
      return renderBillingSection();
    }

    if (activeSectionId === "usage") {
      return renderUsageSection();
    }

    if (activeSectionId === "subscription") {
      return renderSubscriptionSection();
    }

    if (activeSectionId === "privacy") {
      return renderPrivacySection();
    }

    if (activeSectionId === "terms") {
      return renderTermsSection();
    }

    return renderGeneralSection();
  };

  return renderFrame(
    <div className="account-settings">
      <aside className="account-sidebar" aria-label="Account settings sections">
        <nav className="account-nav">
          {availableNavigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                aria-current={activeSectionId === item.id ? "page" : undefined}
                className="account-nav__item"
                type="button"
                onClick={() => setActiveSectionId(item.id)}
              >
                <Icon aria-hidden="true" size={16} strokeWidth={2} />
                {item.label}
              </button>
            );
          })}
        </nav>

      </aside>

      <div className="account-content">
        <header className="account-content__header">
          <h2>{activeNavigationItem.label}</h2>
          <div className="account-content__actions">
            {activeSectionId === "billing" ? (
              <button
                className="account-button account-button--primary"
                disabled={isFetching}
                type="button"
                onClick={onOpenPricing}
              >
                View plans
                <ArrowRight aria-hidden="true" size={15} strokeWidth={2} />
              </button>
            ) : null}
            <button
              aria-label="Close account settings"
              className="account-page__close"
              type="button"
              onClick={onClose}
            >
              <X aria-hidden="true" size={18} strokeWidth={2} />
            </button>
          </div>
        </header>

        {billingErrorMessage ? (
          <div className="account-notice account-notice--error">
            {billingErrorMessage}
          </div>
        ) : null}

        {renderActiveSection()}
      </div>
    </div>,
  );
};

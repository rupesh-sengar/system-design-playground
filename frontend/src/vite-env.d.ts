/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_APP_ENV?: string;
  readonly VITE_AUTH0_AUDIENCE?: string;
  readonly VITE_AUTH0_CLIENT_ID?: string;
  readonly VITE_AUTH0_CONNECTION?: string;
  readonly VITE_AUTH0_DOMAIN?: string;
  readonly VITE_AUTH0_SCOPE?: string;
  readonly VITE_ENABLE_AI_REVIEW?: string;
  readonly VITE_ENABLE_AUTH?: string;
  readonly VITE_ENABLE_BILLING?: string;
  readonly VITE_ENABLE_DEVELOPMENT_NOTICE?: string;
  readonly VITE_ENABLE_ONBOARDING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

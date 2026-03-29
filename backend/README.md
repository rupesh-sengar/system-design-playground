# Backend

Express + TypeScript backend for the System Design Platform. The initial AI stack uses Google ADK with Gemini and exposes structured APIs for frontend feedback and hint generation.

## Endpoints

- `GET /healthz`
- `POST /v1/ai/validate-design`
- `POST /v1/ai/generate-hints`

`/v1/ai/*` expects a valid Auth0 bearer token when `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` are configured.

## Run locally

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The service can boot without an API key, but AI routes will return `503` until `GEMINI_API_KEY` or `GOOGLE_API_KEY` is configured.

## Auth0 JWT validation

Set these env vars to protect the AI routes with Auth0:

```bash
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://your-api-identifier
AUTH0_REQUIRED_SCOPE=read:ai
```

If `AUTH0_REQUIRED_SCOPE` is provided, the token must include that scope as well.

## ADK dev UI

```bash
cd backend
npm run adk:web
```

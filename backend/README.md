# Backend

Fastify + TypeScript backend for the System Design Platform. The initial AI stack uses Google ADK with Gemini and exposes structured APIs for frontend feedback and hint generation.

## Endpoints

- `GET /healthz`
- `POST /v1/ai/validate-design`
- `POST /v1/ai/generate-hints`

## Run locally

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The service can boot without an API key, but AI routes will return `503` until `GEMINI_API_KEY` or `GOOGLE_API_KEY` is configured.

## ADK dev UI

```bash
cd backend
npm run adk:web
```

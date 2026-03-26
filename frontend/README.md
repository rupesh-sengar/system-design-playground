# System Design Lab

A React + TypeScript + Vite practice app for system design interview prep. The project ships with a seeded library of interview-style prompts across social, storage, collaboration, commerce, infrastructure, AI, and other domains.

## Features

- 60+ seeded system design problems with `Easy`, `Medium`, and `Hard` difficulty labels
- Search, category, difficulty, and status filtering
- Random drill button for interview practice
- Bookmark and practiced state persisted in local browser storage
- Detail panel with scale targets, design focus areas, pitfalls, and follow-up variants
- A six-stage interview playground for requirements, entities, interfaces, data flow, high-level design, and deep dives

## Project structure

- `src/features/problem-library/` contains the feature module: typed models, filtering and sorting logic, persistence hooks, and UI components
- `src/features/practice-playground/` contains the guided practice workspace and per-problem saved notes
- `src/data/problemLibrary.ts` contains the curated prompt library
- `src/shared/ui/` contains reusable presentational primitives
- `src/styles/app.css` contains the application styling

## Run locally

```bash
npm install
npm run dev
```

## Type-check and build

```bash
npm run typecheck
npm run build
```

# Corti Medical Note Dashboard

A black-and-white, TanStack Start dashboard for processing medical notes with Corti's API. It supports text paste, file drop, live voice dictation, and extracts clinical facts, diagnosis codes, summaries, and patient timelines.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/664fc99a-67b6-4d6c-a065-7d095633dd3a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Running locally

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- A package manager — this project uses **Bun** by default, but `npm`, `pnpm`, and `yarn` also work.
  - [Install Bun](https://bun.sh/docs/installation)

### 1. Clone the repository

```sh
git clone <this-repository-url>
cd <repository-name>
```

### 2. Install dependencies

With Bun:

```sh
bun install
```

With npm:

```sh
npm install
```

### 3. Add environment variables

Create a `.env` file in the project root and add the Corti API credentials:

```sh
CORTI_CLIENT_ID=your-client-id
CORTI_CLIENT_SECRET=your-client-secret
```

Optional Corti settings (defaults are shown):

```sh
CORTI_ENVIRONMENT=eu
CORTI_TENANT=base
```

Get the credentials from your Lovable project:

1. Open the project in the [Lovable editor](https://lovable.dev/projects/664fc99a-67b6-4d6c-a065-7d095633dd3a).
2. Go to **Settings → Environment variables**.
3. Copy the values for `CORTI_CLIENT_ID` and `CORTI_CLIENT_SECRET` into your local `.env` file.

> Note: These credentials are required for the "Process note", voice dictation, summary, and timeline features to work. They are used server-side by the `createServerFn` functions in `src/lib/corti.functions.ts`.

### 4. Start the development server

With Bun:

```sh
bun dev
```

With npm:

```sh
npm run dev
```

The app will be available at `http://localhost:8080`.

### 5. Build for production

With Bun:

```sh
bun run build
```

With npm:

```sh
npm run build
```

Preview the production build:

```sh
bun run preview
# or
npm run preview
```

## Project structure

- `src/routes/index.tsx` — Main dashboard with patient overview, timeline, journal input, and extracted results.
- `src/routes/tables.tsx` — Data tables view (Bloodtests, Diagnosis, Flowsheet, Vitals, Prescription, Medication).
- `src/lib/corti.functions.ts` — Server functions that call Corti's API for facts, coding, dictation, and summary.
- `src/lib/dashboard-state.tsx` — Shared state provider that keeps dashboard data while navigating between tabs.
- `src/components/PatientTimeline.tsx` — Horizontal, scrollable patient timeline component.

## Notes

- Voice dictation uses the browser's `MediaRecorder` API and streams 16 kHz PCM audio to Corti's dictation bridge.
- The app is built on **TanStack Start** with **Vite 8** and **Tailwind CSS v4**.
- This repository does not currently require a local Supabase database; the data tables use static CSV data shipped with the project.

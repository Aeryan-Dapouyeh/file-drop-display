# Plan: Medical Note Processing UI

Build the front-end for a tool that processes clinical notes. It will accept text input (file drop and paste) and later voice recording, then pass text to a backend for fact/medical-code extraction and patient timeline construction.

## Phase 1 — .txt file drop + text display

Build the first screen as a black-and-white, minimal upload page.

- Replace the placeholder index route with a dedicated upload page.
- Create a drag-and-drop zone for .txt files with clear empty/error states.
- On drop, read the file client-side and render its contents in a large, editable text field.
- Add a paste / manual input fallback so the user can also type or paste directly.
- Add a "Process" button (disabled when empty) that will later call the extraction backend.
- Style: black primary, white background, high-contrast borders, generous whitespace, no color accents.

## Phase 2 — Voice recording input

Add a second input mode next to the file drop.

- Add a tab or toggle to switch between Text and Voice.
- Use the browser MediaRecorder API to capture audio from the microphone.
- Show recording state, timer, and a stop button.
- Store the recorded audio blob for later transcription (backend or speech-to-text API).
- Keep the same black-and-white visual language.

## Phase 3 — Backend integration + patient timeline

Connect the front-end to the existing Python backend and display results.

- Decide where the Corti/fact-extraction logic runs. Options:
  - TanStack Start server functions that proxy to the Python backend (e.g., hosted API or serverless function).
  - Re-implement or wrap the Python functions if they can be exposed as a fast HTTP service.
- Send the text (from file or transcription) to the backend.
- Receive extracted facts, medical codes, and timeline events.
- Render a patient timeline view from the extracted events.
- Add error handling and loading states for long-running extractions.

## Technical notes

- Use TanStack Start routes and server functions for the API surface.
- Keep all client-side file reading in the browser (no upload yet in Phase 1).
- Use shadcn/ui components where they help, but enforce the black-and-white palette with custom tokens.
- Add route metadata and a proper title/description for the home page.
- Lovable Cloud will be enabled when backend persistence or auth is needed (Phase 2/3).

## First deliverable

The immediate goal is the file-drop + text-display page. It will be a single-page app at `/` that lets the user drop a .txt file and immediately see the text in a field, styled in black and white.

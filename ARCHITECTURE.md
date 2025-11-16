\# SteamGameHelper – Architecture



\## Overview



The app is split into two main layers:



\- \*\*Frontend (React + Vite + TypeScript)\*\* – UI, user flows and local state.

\- \*\*Backend (Tauri + Rust)\*\* – Steam Web API, local filesystem, AI runtime, library cache.



Main responsibilities:

\- `src/` – React UI and feature logic.

\- `src/lib/backend.ts` – single bridge between frontend and Tauri commands.

\- `src/assistant/` – assistant UI (chat shell + heuristics).

\- `src/ui/` – shared UI components (logo, onboarding, layout styles).

\- `src-tauri/` – Rust side: commands, Steam integration, local AI backend.



\## Frontend structure



\### Entry screen



\- `src/ScanScreen.tsx`

&nbsp; - header with logo and app title

&nbsp; - assistant panel

&nbsp; - settings modal (tabs: params / scan / library)

&nbsp; - onboarding flow



\### Assistant



\- `src/assistant/AskAssistant.tsx`

&nbsp; - two modes:

&nbsp;   - `chat` – AI chat UI (currently visually disabled with overlay)

&nbsp;   - `raw` – raw heuristics view

\- `src/assistant/RawHeuristicsTab.tsx`

&nbsp; - loads cached Steam library via `call("load\_library\_cache")`

&nbsp; - computes local scores and suggestions for games



\### Shared UI



\- `src/ui/AnimatedLogo.tsx` – animated logo.

\- `src/ui/Onboarding.tsx` – onboarding for API key, SteamID64 and family IDs.

\- `src/ui/ScanScreen.css` – layout and visual fixes.



\### Backend bridge



\- `src/lib/backend.ts`



Exports:

\- `call(cmd, args?)` – thin helper around Tauri `invoke`.

\- shared types:

&nbsp; - `LibraryGame`

&nbsp; - `AccountHint`

&nbsp; - `PartialSettings`



All frontend code talks to the backend only through this file.



\## Backend (Tauri / Rust)



\- `src-tauri/Cargo.toml` – Rust project configuration.

\- `src-tauri/src/main.rs` – Tauri bootstrap and command registration.

\- `src-tauri/src/commands.rs` – main app commands:

&nbsp; - settings: `get\_settings`, `save\_settings`

&nbsp; - scanning: `scan\_library\_unified`

&nbsp; - cache: `load\_library\_cache`, `save\_library\_cache`

&nbsp; - helpers: `open\_apikey\_page`, `ensure\_browser\_helper`, `open\_extensions\_manager`, etc.

\- `src-tauri/src/llm\_backend.rs` – local LLM runtime integration.



Frontend never imports Rust directly; it uses only the Tauri command names defined here.



\## Data flow



1\. User sets API key and SteamID64 in \*\*Settings → Params\*\*.

2\. Frontend calls `call("save\_settings", …)` to persist data.

3\. On \*\*Settings → Scan\*\*, user runs unified scan.

4\. Frontend calls `call("scan\_library\_unified", …)`.

5\. Rust calls Steam Web API, merges main + family accounts, returns `LibraryGame\[]`.

6\. Frontend saves this via `call("save\_library\_cache", { games })`.

7\. Assistant and heuristics read from `call("load\_library\_cache")` to build suggestions.



\## Branching model



\- `main` – stable snapshots.

\- `dev` – integration branch with the latest working features.

\- `feature/\*` – short-lived feature branches:

&nbsp; - `feature/scan-steam-library`

&nbsp; - `feature/architecture-v1`

&nbsp; - `feature/architecture-docs` (this branch)



Workflow:

1\. Branch from `dev` into `feature/...`.

2\. Implement and commit changes.

3\. Merge back into `dev`.

4\. Periodically merge `dev` into `main` via Pull Request.




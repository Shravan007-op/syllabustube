# AGENTS.md — SyllabusTube Guide for AI Coding Agents

## 1. Project Summary
SyllabusTube transforms university syllabus documents (PDF, image, or text) into unit-by-unit YouTube video study roadmaps. It extracts and structures course topics client-side and via AI, then pairs each topic with ranked, relevant lecture videos.

## 2. Stack
- **Frontend**: React 19, TypeScript (ES2022, bundler), Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`, `lucide-react`, PDF.js (`pdfjs-dist`), Tesseract.js (`tesseract.js`), `motion`.
- **Local Dev Server**: Express 4, `tsx`, `dotenv` (`server.ts`, `server/syllabusAnalyzer.ts`).
- **Serverless Proxies**: Vercel Serverless Function (`api/proxy.js`), Netlify Function (`netlify/functions/api.js`).
- **Backend**: Google Apps Script (`apps-script/Code.gs`).
- **AI & Video APIs**: Google Gemini API (`GEMINI_API_KEY` / backup key via Apps Script; `@google/genai` in package.json), YouTube Data API v3 (`YOUTUBE_API_KEY` via Apps Script).
- **Database / Auth**: Supabase is not present in the codebase (unknown).

## 3. Folder Map
- `api/proxy.js`: Vercel serverless proxy with rate limiting, CORS allowlisting, and shared secret forwarding.
- `apps-script/Code.gs`: Google Apps Script backend handling Gemini syllabus structuring and YouTube search.
- `docs/screenshots/`: Application screenshots for light mode, dark mode, and preferences.
- `netlify/functions/api.js`: Netlify serverless function mirroring the reverse proxy logic.
- `server.ts` & `server/`: Express development server and local analyzer utility.
- `src/components/`: UI components (Navbar, HeroUploader, TopicVideoRoadmap, VideoCard, Stepper, ErrorBoundary, SearchPreferencesPanel, Footer).
- `src/config.ts`: Global limits (25MB, 150 pages, chunk size), storage keys, and typed error mappings.
- `src/data/sampleSyllabi.ts`: Mock syllabi datasets, fallback demonstration pool, and suggested channel names.
- `src/services/`: HTTP transport to Apps Script proxy and direct endpoints (`geminiService.js`, `youtubeService.js`).
- `src/types/syllabus.ts`: Core TypeScript interfaces for syllabi, units, topics, search preferences, and video results.
- `src/utils/`: Client extraction (`pdfExtractor.ts`, `imageOcrExtractor.ts`), text cleaning (`textStructure.ts`), chunking (`chunking.ts`), schema validation (`syllabusApi.ts`), metadata and ranking (`videoMetadata.ts`, `rankingEngine.ts`).
- `src/App.tsx`, `main.tsx`, `index.css`: Main application component, React DOM mount, and design tokens stylesheet.

## 4. Commands
- Install: `npm install`
- Dev: `npm run dev` (executes `tsx server.ts`)
- Build: `npm run build` (executes `vite build`)
- Lint: `npm run lint` (executes `tsc --noEmit`)

## 5. Data Flow
1. **Input & Validation**: User uploads PDF/image or enters text in `HeroUploader.tsx`; validated against limits by `validateSyllabusFile` in `src/utils/documentExtractor.ts`.
2. **Extraction & Cleaning**: `extractPdfDocument` (`pdfExtractor.ts`) extracts text per page with PDF.js, using Tesseract.js Web Worker only on pages lacking text; `normalizeSyllabusText` (`textStructure.ts`) strips headers, footers, and page numbers.
3. **Chunking & Dispatch**: `splitTextIntoChunks` and `processChunksProgressively` (`chunking.ts`) partition text into unit chunks (<=8000 chars) and sequentially call `analyseSyllabusViaApi` (`syllabusApi.ts`).
4. **Proxy & AI Structuring**: Calls route through `/api/proxy` or `/.netlify/functions/api` to `Code.gs`, which calls Gemini (`handleAnalyseSyllabus_`) with prompt-injection delimiters and returns structured JSON.
5. **Progressive Merge**: `validateAndHydrateStructuredSyllabus` (`syllabusApi.ts`) hydrates units, rendering them progressively in `App.tsx` as chunks complete.
6. **Lazy Video Search**: `TopicVideoRoadmap.tsx` lazy-loads topic videos per unit on demand via `searchTopicVideosWithAppsScript` (`youtubeService.js` -> `Code.gs`), caching results and tracking watched status in `localStorage`.

## 6. Environment Variables and Script Properties
- **Frontend / Client (`.env`)**: `VITE_APPS_SCRIPT_URL` (Apps Script Web App `/exec` URL), `VITE_PORT` (local port).
- **Proxy (Vercel / Netlify)**: `VITE_APPS_SCRIPT_URL`, `PROXY_SECRET` (shared secret sent in payload), `ALLOWED_ORIGIN` (CORS allowlist).
- **Apps Script (Script Properties)**: `GEMINI_API_KEY`, `GEMINI_API_KEY_BACKUP` (failover), `YOUTUBE_API_KEY`, `GEMINI_MODEL` (model override), `PROXY_SECRET` (rejects unauthorized proxy calls).

## 7. Rules for Agents
- Never expose API keys, service-role keys, or the shared secret to the frontend bundle, sourcemaps, or git history.
- All extraction stays client-side; only clean extracted text is sent to the backend.
- Minimize API quota: lazy-load YouTube searches per unit, batch calls, use persistent cache in Apps Script, and avoid redundant queries.
- Keep scoring weights and threshold constants centralized in a config file (`src/config.ts`).
- Use the existing error codes and maintain backend/proxy response format `{ ok: false, error: { code, message } }`.
- Do only the requested task, add no extra features, keep existing features working, and run the build before finishing.

## 8. Current Status
- **Implemented**: Client-side PDF text extraction and Web Worker OCR; 25MB / 150-page limits; text cleaning and chunking with backoff retry; Gemini structuring with prompt-injection isolation; unit-by-unit lazy YouTube search; local watched tracking; light/dark mode with flash prevention; Vercel & Netlify proxies with rate limiting and secret check; error boundary and typed errors.
- **Not Implemented**: User database and authentication; server-side saved syllabi; cross-device preferences sync; internal video relevance rating system; direct NPTEL / MIT OpenCourseWare playlist scrapers.

## 9. Planned Work
- Accounts and saved syllabi using Supabase with Row Level Security (RLS).
- User region, language, and channel preferences stored in user profile.
- Internal video relevancy ratings to improve topic matching over time.
- Direct syllabus indexing for NPTEL and MIT OpenCourseWare via official YouTube playlists.

## 10. Known Limits
- **YouTube API Quota**: 10,000 units/day default quota; `search.list` costs 100 units per call.
- **File Upload Caps**: Max 25 MB and 150 pages per PDF document (`src/config.ts`).
- **Apps Script Rate Limits**: Script-wide limit of 15 req/min for Gemini analysis and 60 req/min for YouTube search in `Code.gs`.

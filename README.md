# Shinro — Backend

Backend for **Shinro**, a study-planner app. A student uploads the syllabus of a subject as a PDF. An AI model reads it and turns it into a roadmap of **units → topics → subtopics**. The student then ticks off what they have studied and tracks their progress.

> **Proprietary software. All rights reserved.** This code may not be used, copied, modified or distributed without written permission from the author. See [Copyright](#copyright) below.

## Features

- Email and password sign-in ([better-auth](https://www.better-auth.com/)), with support for the Expo mobile app.
- Upload a syllabus PDF (max 5 MB). Text is extracted and sent to Google Gemini, which returns a structured roadmap.
- Roadmaps are saved per user, with units, topics and subtopics.
- Rename or delete roadmaps, units, topics and subtopics.
- Mark topics as completed. This also marks their subtopics.
- Follow or unfollow roadmaps.

## Tech stack

- **Runtime:** Node.js, TypeScript (ES modules)
- **Server:** Express 5
- **Database:** PostgreSQL with Prisma ORM 7 (`@prisma/adapter-pg`)
- **Auth:** better-auth (+ `@better-auth/expo`)
- **AI:** Google Gemini (`@google/genai`), output validated with Zod
- **Uploads:** multer (in memory) + pdf-parse

## Getting started (authorized collaborators only)

### Prerequisites

- Node.js 20 or later
- A PostgreSQL database
- A Google Gemini API key

### Environment variables

Create a `.env` file in the project root:

| Variable                 | Required | Description                                                    |
| ------------------------ | -------- | -------------------------------------------------------------- |
| `DATABASE_URL`         | Yes      | PostgreSQL connection string                                   |
| `BETTER_AUTH_SECRET`   | Yes      | Secret used by better-auth to sign sessions                    |
| `BETTER_AUTH_URL`      | Yes      | Public base URL of this server                                 |
| `GEMINI_API_KEY`       | Yes      | Google Gemini API key                                          |
| `GEMINI_MODEL`         | No       | Model for roadmap extraction. Default `gemini-3.5-flash-lite` |
| `GEMINI_MODEL_DETECT`  | No       | Model for subject detection (analyze). Default `GEMINI_MODEL` |
| `UPSTASH_REDIS_REST_URL`   | Yes  | Upstash Redis URL (rate limits shared across instances)       |
| `UPSTASH_REDIS_REST_TOKEN` | Yes  | Upstash Redis token                                            |
| `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` | No (all or none) | Private S3-compatible bucket (Supabase Storage, Backblaze B2, AWS S3, Cloudflare R2) for permanent PDF storage; see `.env.example`. Without it, PDFs are kept in Gemini for ~48h only |
| `S3_FORCE_PATH_STYLE`  | No       | Path-style bucket URLs. Default `true` (Supabase requires it)  |
| `CLOUDINARY_URL`       | No       | `cloudinary://<api_key>:<api_secret>@<cloud_name>`. PDF storage in Cloudinary, used for new PDFs when `S3_*` isn't set. Keep it after moving to S3 so PDFs already in Cloudinary stay readable |
| `JWT_SECRET`           | No       | Unused                                                         |
| `GOOGLE_CLIENT_ID`     | No       | Google OAuth client id (Google sign-in not enabled yet)       |
| `GOOGLE_CLIENT_SECRET` | No       | Google OAuth client secret                                     |
| `ALLOW_EXPO_GO`        | No       | `"true"` to trust Expo Go URLs during development. Default `false` |
| `ALLOWED_ORIGINS`      | No       | Comma-separated CORS origins. Default `http://localhost:3000` |
| `PORT`                 | No       | Default `3000`                                                |
| `NODE_ENV`             | No       | `development`, `production` or `test`. Default `production`. Set `development` locally to get stack traces in error responses |

Never commit `.env`. It is already in `.gitignore`.

### Install and run

```bash
npm install                 # also runs prisma generate
npx prisma migrate dev      # apply database migrations
npm run dev                 # start with auto-reload (tsx watch)
```

Production build:

```bash
npm run build               # prisma generate + tsc
npm start                   # node dist/index.js
```

## API

All routes below are under `/api` and require a signed-in session.

| Method | Path                                | Description                                                               |
| ------ | ----------------------------------- | ------------------------------------------------------------------------- |
| GET    | `/spaces`                         | List the user's spaces with `roadmapCount` and combined `progress`        |
| POST   | `/spaces`                         | Create a space — body `{ "name": "UPSC 2027" }`                          |
| GET    | `/spaces/:spaceId`                | A space's roadmaps and progress, plus the PDFs uploaded into it with every detected subject (`subjects[].roadmapId` is set once created; `canGenerate` to create more) |
| PATCH  | `/spaces/:spaceId`                | Rename a space — body `{ "name": "..." }`                               |
| DELETE | `/spaces/:spaceId`                | Delete a space and every roadmap in it                                    |
| POST   | `/syllabus/analyze`               | Upload a syllabus PDF into a space (form fields `pdffile`, ≤ 100 pages, and `spaceId`) and list the subjects in it |
| GET    | `/syllabus/uploads/:uploadId/pdf` | Short-lived (15 min) link to view the uploaded PDF — `{ url, expiresAt, fileName }` (needs PDF storage) |
| POST   | `/syllabus/:uploadId/roadmaps`    | Generate one roadmap per chosen subject — body `{ "subjectIndexes": [0, 2] }` or `{ "custom": { "name": "...", "startPage": 3, "endPage": 5 } }` |
| POST   | `/uploadfile`                     | Legacy: upload a PDF and generate a roadmap for its first subject (optional form field `spaceId`, otherwise "My roadmaps") |
| GET    | `/roadmap`                        | List the user's roadmaps                                                  |
| GET    | `/roadmap/isfollowing`            | List roadmaps the user follows                                            |
| GET    | `/roadmap/:roadmapId`             | Get one roadmap with its units, topics and subtopics                      |
| PATCH  | `/roadmap/:roadmapId`             | Rename a roadmap — body `{ "name": "..." }`                             |
| DELETE | `/roadmap/:roadmapId`             | Delete a roadmap                                                          |
| PATCH  | `/roadmap/isfollowing/:roadmapId` | Follow or unfollow — body `{ "isFollowing": true }`                     |
| PATCH  | `/units/:unitId`                  | Rename a unit                                                             |
| DELETE | `/units/:unitId`                  | Delete a unit                                                             |
| PATCH  | `/topics/:topicId`                | Rename a topic                                                            |
| DELETE | `/topics/:topicId`                | Delete a topic                                                            |
| PATCH  | `/topics/:topicId/complete`       | Mark a topic and its subtopics completed — body `{ "completed": true }` |
| PATCH  | `/subTopics/:subtopicId`          | Rename a subtopic                                                         |
| DELETE | `/subTopics/:subTopicId`          | Delete a subtopic                                                         |
| GET    | `/study-sessions/active`          | The open (running or paused) study session, or `null`                     |
| POST   | `/study-sessions`                 | Start a stopwatch session on a roadmap — body `{ "roadmapId": "..." }` (one open session at a time; 409 otherwise) |
| POST   | `/study-sessions/:sessionId/pause` | Pause the stopwatch                                                     |
| POST   | `/study-sessions/:sessionId/resume` | Resume it                                                              |
| POST   | `/study-sessions/:sessionId/end`  | End and save it — body `{ "timeZone": "Asia/Kolkata" }`; returns the summary and `streak` |
| DELETE | `/study-sessions/:sessionId`      | Discard an open session                                                   |
| GET    | `/progress?timeZone=&days=7`      | Today's totals, the last `days` days, `streak` (`current`, `longest`, `studiedToday`), `studyDays` and recent sessions |

### Study sessions and streaks

A session is a stopwatch on one roadmap. While it is open (running or paused), every topic or
subtopic ticked on that roadmap is logged to it, and unticking removes it; ticks with no open
session only update the roadmap. Ending a session saves its time (capped at 12 hours) on the
user's local day. A day counts toward the streak once at least 1 minute was studied in it,
ticked items or not; the current streak lasts until a whole day passes without study.

Authentication routes are handled by better-auth under `/api/auth/*`.

### Syllabus flow: analyze → pick → generate

Every roadmap lives in a **space** the user creates and names (e.g. "UPSC 2027"). PDFs are
uploaded into a space, and only the subjects the user picks become roadmaps there.

1. **Analyze.** `POST /syllabus/analyze` checks the page count locally, uploads the PDF to
   the Gemini Files API (kept ~48 hours) and detects its subjects. Results are cached by the
   PDF's SHA-256, so a PDF that anyone analyzed before returns instantly and doesn't count
   toward the daily analysis limit (10/day per user). Response:
   `{ uploadId, expiresAt, pageCount, fromCache, documentType, examOrBoard, language, subjects: [{ index, name, group, startPage, endPage, roadmapId }] }`
   (`roadmapId` is set when the space already has a roadmap for that subject).
   Not a syllabus → 422.
2. **Pick.** If there is one subject, the app can generate it directly; otherwise it shows
   the list (grouped by `group`, e.g. "Semester 3", "Prelims").
3. **Generate.** `POST /syllabus/:uploadId/roadmaps` extracts each chosen subject (up to 10,
   3 in parallel) into its own roadmap in the upload's space, using the subject's page range
   as a hint. Response:
   `{ spaceId, results: [{ index, name, group, status: "SUCCEEDED", roadmap, warnings } | { index, name, group, status: "FAILED", error }] }`.
   Each subject counts toward the roadmap generation limit (10/hour per user).
   With PDF storage (`S3_*`) configured, each PDF is stored permanently (once per content hash),
   so subjects can be generated months later: when Gemini's ~48h copy is gone (or was uploaded
   with another API key), the server re-uploads it from storage automatically. Without it, an unavailable upload
   returns 410; upload the PDF again (the cached analysis makes that instant).

Limits and the prompt version live in `src/config/syllabus.ts`.

## Project structure

```
prisma/              database schema and migrations
src/
  index.ts           app entry point
  controllers/       request handlers
  routes/            route definitions
  middleware/        auth, upload, error handling
  lib/               database, auth, env, AI, PDF parsing, prompts
  validationSchema/  Zod schemas for AI output
  types/             TypeScript type extensions
```

## Copyright

Copyright © 2026 Shailja Yadav. All rights reserved.

Shinro and this project, including its name, source code, prompts, database design and documentation, is the private property of the author. It is **not** open source.

You may **not** use, copy, modify, merge, publish, distribute, sublicense, sell, or create derivative works from any part of this project, for personal or commercial purposes, without **prior written permission** from the author.

Being able to view this repository does not give you any right to use it.

To request permission, contact: **shailjayadav7275@gmail.com**

See [LICENSE](LICENSE) for the full terms.

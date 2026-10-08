# Backend Code Review: Recommended Fixes

Review date: 2026-10-05. No code was changed while preparing this review.
`tsc --noEmit` passes; adding `--noUnusedLocals` reports the unused code listed in section 5.

Priority legend: 🔴 Critical (security/data loss) · 🟠 High (bugs / production breakage) · 🟡 Medium (best practice) · 🟢 Low (cleanup / style)

---

## 1. 🔴 Critical: Security

### 1.1 Missing ownership checks (IDOR): any logged-in user can modify anyone's data
The following handlers in [src/controllers/roadmap.ts](src/controllers/roadmap.ts) look records up **by id only** and never check that they belong to `req.user.id`:

| Handler | Line | Effect |
|---|---|---|
| `deleteRoadmapById` | [88-101](src/controllers/roadmap.ts#L88-L101) | Delete any user's roadmap |
| `deleteUnitById` | [120-133](src/controllers/roadmap.ts#L120-L133) | Delete any unit |
| `deleteTopicById` | [152-165](src/controllers/roadmap.ts#L152-L165) | Delete any topic |
| `deleteSubTopicById` | [184-197](src/controllers/roadmap.ts#L184-L197) | Delete any subtopic |
| `editRoadmapName` / `editUnitName` / `editTopicName` / `editSubTopicName` | [221](src/controllers/roadmap.ts#L221), [248](src/controllers/roadmap.ts#L248), [274](src/controllers/roadmap.ts#L274), [301](src/controllers/roadmap.ts#L301) | Rename anything |
| `completeTopic` | [325-340](src/controllers/roadmap.ts#L325-L340) | Mark anyone's topic complete |

IDs are UUIDs, but they are returned in API responses and can leak, so you shouldn't rely on them being secret.

**Fix:** scope every query by the owner through the relation chain, and do it in one query instead of "find, then delete":
```ts
// roadmap
const { count } = await prisma.roadmap.deleteMany({ where: { id: roadmapId, userId } });
if (count === 0) throw new AppError("Roadmap not found", 404);

// unit / topic / subtopic: filter through relations
await prisma.unit.deleteMany({ where: { id: unitId, roadmap: { userId } } });
await prisma.topic.updateMany({ where: { id: topicId, unit: { roadmap: { userId } } }, data: { name } });
await prisma.subTopic.deleteMany({ where: { id, topic: { unit: { roadmap: { userId } } } } });
```
This also removes the race condition between the `findUnique` check and the `delete`.

### 1.2 Session tokens written to logs
[src/middleware/authmiddleware.ts:10-12](src/middleware/authmiddleware.ts#L10-L12) logs the raw `Cookie` and `Authorization` headers on **every request**. Anyone who can read the logs can hijack sessions. **Remove these logs.**

### 1.3 User data written to logs
- [src/lib/parsePdf.ts:7,13](src/lib/parsePdf.ts#L7) logs the entire extracted PDF text (twice).
- [src/lib/llmRetry.ts:13-15](src/lib/llmRetry.ts#L13-L15) logs the full raw LLM response.

These logs are noisy and expose user content. Log only sizes, IDs and durations.

### 1.4 `debug-upload.pdf` is committed to git
A debug copy of a user upload is tracked in the repo. Remove it (`git rm --cached debug-upload.pdf`) and add `*.pdf` / `debug-*` to [.gitignore](.gitignore).

### 1.5 Stack traces can leak in production by default
[src/lib/env.ts:5](src/lib/env.ts#L5) defaults `NODE_ENV` to `"development"`, and [src/middleware/errormiddleware.ts:32](src/middleware/errormiddleware.ts#L32) sends the full error and stack when it is `development`. If someone forgets to set `NODE_ENV` in production, stack traces go to clients. Do one of these:
- Check `env.NODE_ENV === "development"` only when it is set explicitly, **or**
- Default to `"production"`, **or**
- Make `NODE_ENV` required with no default.

Also allow `"test"` in the enum.

### 1.6 No rate limiting on the expensive LLM endpoint
`POST /api/uploadfile` parses a PDF and calls Gemini on each request, so one user can run up your API bill. Add `express-rate-limit` (per user/IP) to this route at minimum. Also consider adding `helmet()` in [src/index.ts](src/index.ts).

---

## 2. 🟠 High: Bugs and production breakage

### 2.1 `Router` is imported incorrectly
[src/routes/fileUploadRoute.ts:1](src/routes/fileUploadRoute.ts#L1): `import Router from "express"` imports the **`express()` app factory**, not `Router`. Your "router" is actually a full sub-application. It works by accident.
```ts
import { Router } from "express";
```

### 2.2 `dotenv` is a devDependency but is imported at runtime
[src/lib/env.ts:1](src/lib/env.ts#L1) imports `"dotenv/config"`, but `dotenv` is listed in `devDependencies` in [package.json](package.json). A production install (`npm ci --omit=dev`) followed by `npm start` will crash. Do one of these:
- Move `dotenv` to `dependencies`, **or**
- Drop it and use Node's built-in `node --env-file=.env dist/index.js`.

### 2.3 Upload errors return 500 instead of 4xx
- The multer `fileFilter` ([src/middleware/fileUploadmiddleware.ts:15](src/middleware/fileUploadmiddleware.ts#L15)) throws a plain `Error`. In production the error handler treats it as non-operational, so the response is **500 "Something went very wrong!"**. Throw `new AppError("Only PDF files are allowed", 400)` instead.
- File-too-large errors (`MulterError` with code `LIMIT_FILE_SIZE`) also become 500. Map them to **413** in the global error handler.

### 2.4 Prisma "record not found" errors return 500
The `update` calls in the `edit*` / `completeTopic` handlers throw Prisma error `P2025` when the id doesn't exist, so the client gets a 500. Either use `updateMany` and check `count` (see 1.1), or map `Prisma.PrismaClientKnownRequestError` codes in the error handler: `P2025` → 404, `P2002` → 409, `P2003` → 400.

### 2.5 `completeTopic` doesn't validate input
[src/controllers/roadmap.ts:323](src/controllers/roadmap.ts#L323): `completed` is taken from the body without checks. If it is missing, Prisma treats `undefined` as "no change", so the request does nothing but still returns "Task completed successfully". Validate `typeof completed === "boolean"`, as `followingRoadmap` already does.

### 2.6 `DocumentStructureSchema` has a typo
[src/validationSchema/detectedSchema.ts:23](src/validationSchema/detectedSchema.ts#L23): `documentTitle: z.string` is missing `()`. It's currently unused; either fix it or delete the file.

### 2.7 `StudySession` controller is broken (unfinished)
[src/controllers/studySession.ts](src/controllers/studySession.ts):
- Line 10: `!roadmapId && unitId && plannedDuration && ...` is wrong logic. It only throws when `roadmapId` is missing **and** all the other fields are present. You meant `if (!roadmapId || !unitId || ...)`.
- Validation errors should return **400**, not 404.
- It never sends a response and never creates the session.
- It isn't wrapped in `catchAsync` and isn't routed.

When you finish it, validate the body with a Zod schema (see 3.1) and check that `roadmap` and `unit` were actually found.

### 2.8 `parsePdf` leaks resources on error
[src/lib/parsePdf.ts:5-11](src/lib/parsePdf.ts#L5-L11): `destroy()` doesn't run if `getText()` throws. Use `try/finally` (your commented-out version below it already does this correctly). Also, `if (!extractedText)` is always false. Check `extractedText.text.trim()` instead. The `"pdf-parse/worker"` side-effect import on line 1 is redundant with line 2.

### 2.9 Item order isn't guaranteed
Units, topics and subtopics are ordered by `createdAt` ([roadmap.ts:55-60](src/controllers/roadmap.ts#L55-L60)), but a nested `create` inserts them in one transaction, so many rows get **identical timestamps**. Their order is then undefined. Add an explicit `position Int` column to `Unit`, `Topic` and `SubTopic`, set it from the array index in [uploadfilecontroller.ts:122-133](src/controllers/uploadfilecontroller.ts#L122-L133), and `orderBy: { position: "asc" }`.

`getAllRoadmap` and `getFollowingRoadMaps` have no ordering at all.

---

## 3. 🟡 Medium: Best practices

### 3.1 Validate requests with Zod (you already depend on it)
Every handler repeats the same pattern:
```ts
const id = Array.isArray(req.params.x) ? req.params.x[0] : req.params.x;
if (!id) throw new AppError("... id missing", 404);
const { name } = req.body; if (!name?.trim()) ...
```
Create one `validate({ params, body })` middleware with Zod schemas, for example `z.object({ roadmapId: z.uuid() })` and `z.object({ name: z.string().trim().min(1).max(200) })`. This removes about 100 lines of duplicated code, adds max-length limits, and gives consistent 400 responses. A missing or invalid id should be **400**, not 404 (lines 45, 86, 118, 150, 182).

### 3.2 Stop re-checking `req.user` in every controller
`requireAuth` already guarantees the user. Either:
- Apply it once with `router.use(requireAuth)`, **or**
- Add a typed `AuthedRequest` / helper `getUserId(req)` that throws 401 once.

### 3.3 `catchAsync` isn't needed on Express 5
Express 5 forwards rejected promises to the error handler automatically. You can remove `catchAsync` everywhere. If you keep it, use it consistently (`StudySession` doesn't).

### 3.4 Improve the global error handler
In [src/middleware/errormiddleware.ts](src/middleware/errormiddleware.ts):
- Handle `ZodError` (→ 400 with the issues), `MulterError` (→ 400/413) and Prisma errors (see 2.4) before the generic fallback.
- If `res.headersSent`, call `next(err)` instead of responding.
- Log every 5xx error with a request id, not just in production.
- Fix the typos `sendeErrorDev` and `sendErrorPro` → `sendErrorDev` and `sendErrorProd`.

### 3.5 Clean up the environment schema
In [src/lib/env.ts](src/lib/env.ts):
- `JWT_SECRET`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are **required but unused**, so the app won't boot without them. Make them `.optional()` until Google login is enabled, or remove them.
- `ALLOW_EXPO_GO`: use `z.enum(["true","false"]).default("false").transform(v => v === "true")` so it becomes a real boolean.
- `BETTER_AUTH_SECRET`: add `.min(32)`.
- `DATABASE_URL` / `BETTER_AUTH_URL`: use `z.url()`.
- Print `z.prettifyError(error)` so startup errors are readable.
- [src/lib/db.ts:8](src/lib/db.ts#L8): the `!` on `env.DATABASE_URL!` isn't needed.

### 3.6 Use a real logger instead of `console.log`
There are about 20 `console.log` debug statements across `lllmcall.ts`, `llmRetry.ts`, `parsePdf.ts` and `authmiddleware.ts`. Use a structured logger such as `pino` + `pino-http` with log levels, so debug output is off in production and each request gets an id.

### 3.7 Make the LLM layer more robust
- [src/lib/llmRetry.ts](src/lib/llmRetry.ts) is named "retry" but **doesn't retry**. Add 2–3 attempts with backoff for transient errors (429/5xx) and for invalid JSON or schema failures. Also simplify the `lastError` flow.
- Add a **timeout** (`AbortSignal.timeout(...)`) to the Gemini call so a slow request can't hang.
- Move the model name (`"gemini-3.5-flash-lite"` in [lllmcall.ts:8](src/lib/lllmcall.ts#L8)) into env/config.
- Rename `lllmcall.ts` (three l's) → `llmCall.ts`.
- `llmCall` already throws on empty text, so the second empty check in `llmRetry.ts:16` is redundant.

### 3.8 Tell the user when their PDF is truncated
[src/controllers/uploadfilecontroller.ts:83](src/controllers/uploadfilecontroller.ts#L83) cuts the text at 20,000 characters, so large syllabi lose content with no warning. Either:
- Return a `truncated: true` flag / warning, **or**
- Process the text in chunks.

Also rename `testText` → `promptText`.

### 3.9 Return smaller list responses
`getAllRoadmap` and `getFollowingRoadMaps` return the **entire tree** (units → topics → subtopics) for every roadmap, with no pagination. For list screens, `select` only `id`, `name`, `isFollowing`, `createdAt` and progress counts (`_count`). Load the full tree only in `getRoadmapById`. Add `take`/`skip` or cursor pagination.

### 3.10 Clean up REST API design and naming
In [src/routes/fileUploadRoute.ts](src/routes/fileUploadRoute.ts):
- This file holds all the roadmap routes despite its name. Split it into `roadmap.routes.ts` and `upload.routes.ts`.
- Use consistent plural, lowercase resource paths: `/roadmaps`, `/units`, `/topics`, `/subtopics`.
- The param name is inconsistent: `:subtopicId` (line 30) vs `:subTopicId` (line 34).
- `PATCH /roadmap/isfollowing/:roadmapId` → `PATCH /roadmaps/:roadmapId/follow`.
- `GET /roadmap/isfollowing` → `GET /roadmaps?following=true`.
- DELETE should return **204 No Content** (or `{ id }`) rather than echoing the deleted object.
- Use one consistent response shape. Right now some responses have `{ success, roadmap }` and others `{ message, roadmap }`.
- Fix the wrong message in `deleteSubTopicById` ([line 199](src/controllers/roadmap.ts#L199) says "Roadmap deleted"). Also use consistent wording: "Unauthorized" vs "unAuthenticated" vs "Unauthenticated".

### 3.11 Add graceful shutdown and a health check
In [src/index.ts](src/index.ts):
- Handle `SIGTERM`/`SIGINT`: call `server.close()` then `prisma.$disconnect()`.
- Make `GET /health` check the DB (`SELECT 1`).
- If you deploy behind a proxy, set `app.set("trust proxy", 1)`. Rate limiting and secure cookies need it.

### 3.12 Check other auth settings
In [src/lib/auth.ts](src/lib/auth.ts):
- Consider `requireEmailVerification` and password length limits (`minPasswordLength`).
- Make sure the better-auth rate limiter is enabled in production.

---

## 4. 🟡 Medium: Tooling and project setup

- **No tests.** Add `vitest` + `supertest`. Start with the ownership checks from 1.1; they are the highest-value tests.
- **No lint/format.** Add ESLint (`typescript-eslint`) + Prettier. Many inconsistent-formatting issues come from this (e.g. [agent.ts](src/lib/agent.ts), [index.ts:18,24](src/index.ts#L18)).
- **[package.json](package.json):**
  - Add `"typecheck": "tsc --noEmit"`, `"lint"` and `"test"` scripts.
  - `"main": "index.js"` is wrong; remove it.
  - Remove unused dependencies `bcrypt`, `jsonwebtoken`, `@types/bcrypt` and `@types/jsonwebtoken`.
  - Add `"engines": { "node": ">=20" }`.
- **[tsconfig.json](tsconfig.json):**
  - Enable `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` and `noFallthroughCasesInSwitch`.
  - Remove `"jsx": "react-jsx"`. This is a backend.
  - `declaration`/`declarationMap` aren't needed for an app.
- **Add a `.env.example`** listing every required variable. `.gitignore` already allows it.
- **Duplicated skill folders:** `.agents/`, `.claude/` and `.windsurf/` contain the same Prisma skills three times. Keep only the one(s) you use.

---

## 5. 🟢 Low: Dead code and cleanup

| Item | Location |
|---|---|
| Unused `fs` import | [uploadfilecontroller.ts:2](src/controllers/uploadfilecontroller.ts#L2) |
| Large commented-out debug blocks | [uploadfilecontroller.ts:39-112](src/controllers/uploadfilecontroller.ts#L39-L112) |
| Commented-out old implementation | [parsePdf.ts:17-37](src/lib/parsePdf.ts#L17-L37) (after applying fix 2.8) |
| Commented-out old schema | [roadmapSchema.ts:3-20](src/validationSchema/roadmapSchema.ts#L3-L20) |
| Commented-out old type declaration | [express.d.ts:1-13](src/types/express.d.ts#L1-L13) |
| Fully commented file | [src/lib/prompt/structurePrompt.ts](src/lib/prompt/structurePrompt.ts) |
| Empty file | [src/lib/syllabusStructureDetection.ts](src/lib/syllabusStructureDetection.ts) |
| Unused schema | [src/validationSchema/detectedSchema.ts](src/validationSchema/detectedSchema.ts) (also uses `z.ZodType<any>`; type it properly if kept) |
| Commented-out code | [auth.ts:7](src/lib/auth.ts#L7), [auth.ts:28-33](src/lib/auth.ts#L28-L33) |
| `//done` progress comments in routes | [fileUploadRoute.ts](src/routes/fileUploadRoute.ts). Track these in issues, not code. |
| Unused `JWT_SECRET` | See 3.5 |
| `express.d.ts` should use a type-only import | `import type { auth } ...` |
| `globalThis.prisma` caching pattern | [db.ts](src/lib/db.ts). Only useful for Next.js-style hot reload. `tsx watch` restarts the process, so a plain `new PrismaClient()` is enough. |
| Inconsistent file naming | `authmiddleware.ts`, `fileUploadmiddleware.ts`, `uploadfilecontroller.ts`. Pick one style, e.g. `auth.middleware.ts`, `upload.controller.ts`. |

---

## Suggested order of work
1. **1.1** ownership checks, **1.2 / 1.3** remove sensitive logs, **1.4** remove the committed PDF.
2. **2.1–2.5**: router import, dotenv, error status codes, `completed` validation.
3. **3.1** Zod validation middleware. This also removes most of the duplicated controller code.
4. **2.9** `position` column (requires a migration).
5. Error handler, rate limiting, logger, tests, lint.

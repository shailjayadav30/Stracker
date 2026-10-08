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
| `JWT_SECRET`           | Yes      | JWT secret                                                     |
| `GOOGLE_CLIENT_ID`     | Yes      | Google OAuth client id                                         |
| `GOOGLE_CLIENT_SECRET` | Yes      | Google OAuth client secret                                     |
| `ALLOW_EXPO_GO`        | Yes      | `"true"` to trust Expo Go URLs during development            |
| `ALLOWED_ORIGINS`      | No       | Comma-separated CORS origins. Default `http://localhost:3000` |
| `PORT`                 | No       | Default `3000`                                                |
| `NODE_ENV`             | No       | `development` or `production`. Default `development`     |

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
| POST   | `/uploadfile`                     | Upload a syllabus PDF (form field `pdffile`) and generate a roadmap      |
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

Authentication routes are handled by better-auth under `/api/auth/*`.

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

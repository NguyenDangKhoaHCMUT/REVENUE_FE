# REVENUE_FE

Revenue dashboard and admin interface built with Next.js 16, React 19, and Tailwind CSS 4.

## Requirements

- Node.js **24.x LTS** with bundled npm, installed using the [official Node.js instructions](https://nodejs.org/en/download).
- A running backend with database migrations applied.
- Place the **provided `.env.local` file** in this directory before starting or building the application.

## Getting started

Run the following commands from the directory containing this README:

```bash
npm ci
npm run dev
```

| Page | Local URL | Access |
| --- | --- | --- |
| Dashboard | http://localhost:3000/ | Public |
| Login | http://localhost:3000/login | Use the account seeded by the backend |
| Admin | http://localhost:3000/admin | Authentication required |

Build and run the production version:

```bash
npm run build
npm start
```

Check the source code:

```bash
npm run lint
npx tsc --noEmit
```

## Project structure

```text
app/          Dashboard, login, admin pages, and layout
components/   Chart, tooltip, navbar, and notifications
context/      DataContext: shared data and authentication state
services/     API client, auth, dashboard, and batch saves
lib/          Metrics, period comparison, events, and PNG export
types/        TypeScript types
public/       Static assets
```

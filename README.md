# ⚔️ DND Tracker

A local web app to track D&D session notes, lore, and equipment. Each person runs
their own copy with their own SQLite database file — no accounts, no server to host.

## Features

- **Session notes** — write your story; tag entities inline:
  - `[[Volo]]` → a **Character**
  - `((Neverwinter))` → a **Place**
  - `{{Rusty Dagger}}` → an **Item**
- Tagged entities auto-appear under the **Characters / Places / Items** tabs, where you
  fill in descriptions and details. Click a chip in a note to jump to its page.
- **Equipment tracker** — worth, weight, quantity, and whether each item is on **you**
  or on your **horse**. Live weight totals vs. carry capacity, with an over-encumbered
  warning. Total inventory worth shown too.
- **Campaigns** — keep separate campaigns side by side.

## Requirements

- [Node.js](https://nodejs.org) 18+ (you have 24 ✓)

## First-time setup

From this folder:

```bash
npm install
npx prisma migrate dev --name init
```

That creates the database (`prisma/dev.db`).

## Run it (recommended: production mode)

Production mode is light on memory and is what you'll use to actually play:

```bash
npm run build
npm run start
```

Open http://localhost:3000 . After changing code, run `npm run build` again.

> **Low on RAM?** This machine has ~2–3 GB free, and `npm run dev` (hot-reload
> mode) can use 1–2 GB and crash with "JavaScript heap out of memory". Use
> `build` + `start` instead — it uses ~200 MB. Only use `dev` (below) while
> actively editing code, and close other apps first.

## Dev mode (only while editing code)

```bash
npm run dev
```

## Notes

- Your data lives in `prisma/dev.db` — back that file up to keep your campaigns.
- To reset everything, delete `prisma/dev.db` and re-run `npx prisma migrate dev`.
- Finance tracking is a planned addition (schema leaves room for it).

## Stack

Next.js (App Router) · SQLite via Prisma · Tailwind CSS · TypeScript

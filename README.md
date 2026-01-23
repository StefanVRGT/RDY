# RDY - Mentorship Program Course Tracking Platform

A coaching and self-development platform with two applications:
1. Desktop/Web app for Superadmin, Admin, and Mentor management
2. Mobile PWA for Mentees with daily exercise tracking

## Quick Start

This project is configured for **Ralph Ultra** autonomous development.

### Start Ralph Ultra

```bash
cd /home/stefan/ralph-ultra
./dist/index.js
```

Ralph will automatically:
- Load the PRD from `prd.json`
- Start with S1.1 (Initialize Next.js Project)
- Implement each story sequentially
- Verify completion before moving to next story

### Manual Steps Required

After Ralph completes certain stories:

1. **After S1.3**: Run `./scripts/bootstrap-keycloak.sh` to create Keycloak realm
2. **After database schemas**: Run `npm run db:push` to apply migrations

## Project Structure

```
rdy/
├── scripts/
│   └── bootstrap-keycloak.sh    # Keycloak realm setup (manual execution)
├── prd.json                     # Ralph's work plan (6 stories)
└── README.md                    # This file
```

## Tech Stack (To Be Implemented by Ralph)

- **Frontend**: Next.js 14 (App Router) + React 18
- **Backend**: Next.js API Routes + tRPC
- **Database**: PostgreSQL (port 5434) with Drizzle ORM
- **Auth**: Keycloak + NextAuth v5
- **UI**: Tailwind CSS + shadcn/ui (Twilight Studio theme)
- **State**: TanStack Query

## PRD Status

- **Total Stories**: 6
- **Completed**: 0
- **Next**: S1.1 - Initialize Next.js Project with TypeScript

## Notes

- Keycloak instance is shared: `https://auth.neonnidavellir.com`
- PostgreSQL port: 5434 (avoid conflict with Cerebro on 5433)
- S1.3 creates bootstrap script but does NOT execute it (protection)

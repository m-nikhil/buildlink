# BuildLink

Weekly 1:1 matching for professional networking groups.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Postgres, Auth, Edge Functions, RLS)
- **Matching**: AI-powered pairing via Gemini (with random fallback)
- **Video**: Jitsi Meet integration
- **PWA**: Installable with offline support

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type check
npx tsc --noEmit

# Build for production
npm run build
```

## Supabase Setup

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- A Supabase project created at [supabase.com](https://supabase.com)

### Environment Variables

Create `.env.local` with:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Apply Migrations

```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Push all migrations (creates tables, RLS policies, pg_cron schedule)
supabase db push
```

### Deploy Edge Functions

```bash
# Deploy the matching engine
supabase functions deploy group-match

# Set secrets for the edge function
supabase secrets set LOVABLE_API_KEY=your-api-key
```

### Required Supabase Extensions

Enable these in **Dashboard > Database > Extensions**:

- `pg_cron` — schedules the matching job every 2 hours
- `pg_net` — allows cron to make HTTP calls to edge functions
- `pgcrypto` — generates invite codes

### Cron Schedule

The migration automatically creates a `pg_cron` job:

- **Job**: `group-matching-every-2h`
- **Schedule**: Every 2 hours (`0 */2 * * *`)
- **Action**: Calls the `group-match` edge function
- **Logic**: For each group, computes "tomorrow" in the group's timezone, finds matching timeslots, pairs confirmed users via AI

To verify the cron is running:

```sql
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

## Architecture

### Groups & Matching Flow

1. **Owner creates group** (with timezone auto-detected from browser)
2. **Owner adds timeslots** (day + time in group's timezone, max 3)
3. **Members subscribe** to timeslots they're interested in
4. **Members confirm** each week (confirmation window: 3 days before → 1 day before)
5. **Cron triggers matching** (every 2h, checks all timezones)
6. **AI creates pairs** using profile similarity, with a 1-week cooldown (no same pair two consecutive weeks)
7. **Pairs meet** via Jitsi video call
8. **Members give feedback** (1–5 stars + optional note)
9. **Owner gets notified** when all pairs for the week are done

### Key Features

- **Match cooldown**: Same pair won't be matched two weeks in a row
- **Timezone-aware**: Groups store IANA timezone; scheduler runs every 2h to cover all zones
- **Owner analytics**: Completion rates, weekly history, per-member activity
- **Browse & filter**: Search groups by name/description/owner; filter by availability
- **Approval flow**: Public groups can require owner approval to join
- **Notifications**: In-app notifications for matches, confirmations, and completion

### Database Tables

| Table | Purpose |
|-------|---------|
| `groups` | Group metadata (name, visibility, timezone, invite code) |
| `group_members` | Membership with roles (owner/member) |
| `group_timeslots` | Weekly timeslots (day + time, max 3 per group) |
| `timeslot_subscriptions` | Who's interested in which timeslots |
| `timeslot_confirmations` | Weekly confirmations |
| `group_matches` | AI-generated pairings with video call URLs |
| `match_feedback` | Post-match ratings and notes |
| `notifications` | In-app notifications |
| `group_join_requests` | Approval queue for public groups |
| `user_availability` | User's free times (for browse filtering) |
| `profiles` | User profiles (synced from LinkedIn) |

### Edge Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `group-match` | pg_cron (every 2h) or manual | Creates AI-powered 1:1 pairings for tomorrow's timeslots |

## Deployment

### Via Lovable

Open [Lovable](https://lovable.dev) → Share → Publish

### Manual

```bash
# Build
npm run build

# Deploy edge functions
supabase functions deploy group-match

# Push database migrations
supabase db push
```

### Custom Domain

Dashboard → Project → Settings → Domains → Connect Domain

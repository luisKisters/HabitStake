# HabitStake — PRD

Two people pair up to track daily habits. Miss any habit on a day = flat penalty. Weekly settlement shows who owes whom. Payments handled externally (Revolut etc).

**Design:** Use frontend design skill for all UI/UX decisions — layout, component design, color, spacing, typography.

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js (App Router), Vercel |
| Auth | Supabase Auth (Google + Apple OAuth) |
| Database | Supabase Postgres (with RLS) |
| Realtime | Supabase Realtime |
| Styling | Tailwind CSS v4 |
| Animations | Motion (`import from "motion/react"`) |
| Push | web-push (VAPID) |
| Cron | Vercel Cron |

## Core Concepts

- **Pair** — two users linked for mutual accountability
- **Habit** — trackable action with custom schedule and reminder time
- **Penalty** — flat fee per missed day (configurable per pair, default $1.50)
- **Settlement** — weekly (Sunday evening) net balance summary
- **Pause** — date range where tracking/penalties suspended (needs partner approval)

## Database Schema

**profiles** (extends auth.users) — id (uuid, FK → auth.users), display_name, avatar_url, push_subscription (jsonb), created_at

**pairs** — id, user_a (FK), user_b (FK), penalty_amount (decimal, default 1.50), status (pending/active/archived), created_at

**habits** — id, user_id (FK), pair_id (FK), name, active_days (int[]), reminder_time (time), start_date, last_habit_added_date, status (active/pending_deletion/deleted), created_at

**habit_logs** — id, habit_id (FK), date, completed (bool), logged_at

**pauses** — id, pair_id (FK), requested_by (FK), start_date, end_date, pause_type (full/payment_only), status (pending/approved/denied)

**settlements** — id, pair_id (FK), week_start, week_end, user_a_penalties, user_b_penalties, net_owed_by (FK), net_amount

**notifications** — id, user_id (FK), type (enum), title, body, read (bool), data (jsonb)

**approval_requests** — id, pair_id (FK), requested_by (FK), type (habit_deletion/pause/penalty_change), reference_id, status (pending/approved/denied)

**RLS:** All tables scoped to pair membership via `auth.uid()`. Profiles: own row only.

## Execution Phases

### Phase 1: Scaffolding & Auth
> Reference: `REFERENCE.md` → Supabase Setup, Tailwind CSS v4

**Functionality:**
- Sign up / log in with Google or Apple via Supabase Auth
- Onboarding after first login: set display name and avatar
- Layout shell: bottom tab bar (mobile), sidebar (desktop)
- Protected routes — unauthenticated users redirected to login

**Implementation:**
- Bootstrap with the Supabase Next.js starter: `npx create-next-app -e with-supabase` — this includes Supabase server/browser clients, auth callback route, middleware with auth check, and TypeScript + Tailwind already configured
- Update Tailwind CSS to v4 (CSS-based config, `@custom-variant dark` for dark mode prep)
- Create `profiles` table in Supabase with a database trigger that auto-inserts a row when a new user signs up in auth.users
- Login page with Google + Apple buttons calling `supabase.auth.signInWithOAuth({ provider })`
- Onboarding page: check if profile has `display_name` set, if not show form, on submit update profile row and redirect to `/dashboard`
- Root layout with responsive nav component: `<BottomTabBar />` on mobile (fixed bottom), sidebar on `md:` and up

**Test:**
- [ ] Google OAuth login → redirects to dashboard
- [ ] Apple OAuth login → redirects to dashboard
- [ ] Unauthenticated user visiting `/dashboard` → redirected to login
- [ ] First login → onboarding form shown (display name + avatar)
- [ ] Submitting onboarding → profile row updated, redirected to dashboard
- [ ] Returning user (profile complete) → skips onboarding, goes straight to dashboard
- [ ] Bottom tab bar visible on mobile, sidebar on desktop
- [ ] Sign out → session cleared, redirected to login

**Deliverable:** User signs in, completes onboarding, sees empty dashboard.

### Phase 2: Schema & Pairing
> Reference: `REFERENCE.md` → RLS Policies, Realtime

**Functionality:**
- Search users by name/username
- Send pair request to another user
- Accept/decline incoming pair requests
- Multiple pairs allowed (each independent)
- Configure penalty amount per pair (default $1.50)

**Implementation:**
- Create all remaining tables (pairs, habits, habit_logs, pauses, settlements, notifications, approval_requests) via Supabase SQL editor or migrations
- Write RLS policies for each table — core pattern: check `auth.uid()` matches `user_a` or `user_b` in the relevant pair. Use a helper function `is_pair_member(pair_id uuid)` to avoid repetition
- User search: server action that queries `profiles` with `ilike` on `display_name`, debounced input on client (300ms)
- Pair request: insert into `pairs` with `status = 'pending'`, create in-app notification for the other user
- Accept: update `pairs.status` to `'active'`. Decline: update to `'archived'`
- Pair setup: after accepting, show penalty amount config (default $1.50, editable decimal input)
- Pairs list page: show active pairs with partner name/avatar and penalty amount, section for pending incoming/outgoing requests
- Subscribe to Supabase Realtime on `pairs` table filtered by user — so new requests and status changes appear instantly

**Test:**
- [ ] Search by partial name returns matching users
- [ ] Search doesn't return yourself
- [ ] Sending a pair request → other user sees it as pending incoming
- [ ] Accepting a pair request → both users see pair as active
- [ ] Declining a pair request → pair moves to archived, disappears from UI
- [ ] Penalty amount defaults to $1.50 on new pair
- [ ] Editing penalty amount persists and shows for both users
- [ ] RLS: user cannot see pairs they're not part of (test via Supabase client with another user's token)
- [ ] Realtime: pair request appears instantly for the other user without refresh
- [ ] Multiple active pairs display independently

**Deliverable:** Users search, pair up, manage pairs with realtime updates.

### Phase 3: Habits & Daily Tracking
> Reference: `REFERENCE.md` → Motion

**Functionality:**
- Create habit: name, active days (Mon-Sun picker), reminder time, start date
- Edit habit name/schedule/reminder
- Delete habit requires partner approval (creates approval_request)
- Daily view shows only today's scheduled habits
- Mark habits as done (self-report) or leave unmarked
- Retroactive logging within current week only
- 2 months after last habit added → reminder to add new one

**Implementation:**
- Habit creation form: text input for name, toggle buttons for each day (Mon-Sun, stored as int array where 0=Sun...6=Sat), time picker for reminder, date picker for start date (defaults to today)
- Server actions for create/update/delete, all guarded by pair membership check
- Daily view query: fetch habits where `active_days @> ARRAY[today_day_number]` and `status = 'active'` and `start_date <= today`. Join with `habit_logs` for today to show completion state
- Check-off: upsert into `habit_logs` (habit_id + date as logical key). On client, animate with Motion `whileTap={{ scale: 0.95 }}` and green success animation
- Retroactive logging: show past days of current week as tabs/swipeable dates, same check-off UI but for past dates. Prevent logging for dates before habit's `start_date`
- Deletion flow: user taps delete → insert into `approval_requests` with `type = 'habit_deletion'` and `reference_id = habit.id`, set `habits.status = 'pending_deletion'`. Partner sees request in approval inbox (Phase 5). On approval → set status to `'deleted'`
- Realtime: subscribe to `habit_logs` changes filtered by `pair_id` so partner's completions show up live
- Track `last_habit_added_date` on the user's most recent habit — used in Phase 6 for the 2-month reminder cron

**Test:**
- [ ] Create habit with name, active days, reminder time, start date
- [ ] Habit only appears on its scheduled days in the daily view
- [ ] Habit with future start date doesn't show before that date
- [ ] Checking off a habit → `habit_logs` row created, green animation plays
- [ ] Unchecking a habit → log removed or `completed` set to false
- [ ] Retroactive logging: can check off habits for past days within current week
- [ ] Retroactive logging: cannot check off days before habit's `start_date`
- [ ] Cannot retroactively log for previous weeks
- [ ] Edit habit name/schedule/reminder → changes persist
- [ ] Delete habit → creates approval request, habit status becomes `pending_deletion`
- [ ] Partner's completions appear in realtime without refresh
- [ ] `last_habit_added_date` updates when a new habit is created

**Deliverable:** Users create habits, check them off daily with animations.

### Phase 4: Penalties & Settlement
> Reference: `REFERENCE.md` → Vercel Cron

**Functionality:**
- Any missed habit on a day → 1x flat penalty for that day (not per habit)
- Sunday evening (default 8 PM): calculate net balance per pair
- In-app settlement summary + push notification
- Historical settlements list
- Running balance widget on dashboard

**Implementation:**
- Penalty logic (reusable function): for a given user + pair + date, query all active habits scheduled for that day. Check `habit_logs` — if any habit has no completed log for that date, the user gets 1x `pairs.penalty_amount` for that day. Check `pauses` — if an approved full pause covers the date, skip entirely. If payment-only pause, log the miss but penalty = $0
- Weekly settlement cron route at `app/api/cron/settlement/route.ts`, scheduled via `vercel.json` for Sunday 8 PM (`0 20 * * 0`). Protected by `CRON_SECRET` header check. Logic: iterate all pairs with `status = 'active'`, for each pair compute penalties for both users for Mon-Sun of the ending week, compute net (`user_a_total - user_b_total`), insert into `settlements`, create notification rows for both users, trigger push (Phase 6)
- Settlement summary page at `/settlements/[id]`: show net balance ("You owe Alex $4.50" or "Alex owes you $3.00"), per-day breakdown showing which days each user missed
- Historical list at `/settlements`: paginated list of past settlements per pair
- Dashboard widget: query current week's penalty totals so far (Mon through today) and show running balance

**Test:**
- [ ] Missing 1+ habits on a day → exactly 1x penalty (not per habit)
- [ ] Completing all habits on a day → no penalty
- [ ] Day with no scheduled habits → no penalty
- [ ] Settlement cron calculates correct net balance for both users
- [ ] Settlement summary shows correct "you owe" / "they owe" direction
- [ ] Per-day breakdown in settlement matches actual missed days
- [ ] Settlement creates notification rows for both users
- [ ] Historical settlements list is paginated and shows all past weeks
- [ ] Dashboard running balance widget shows correct current-week totals
- [ ] Cron route rejects requests without valid `CRON_SECRET`
- [ ] Pair on a full pause → no penalties counted for paused days
- [ ] Pair on payment-only pause → misses logged but penalty = $0

**Deliverable:** Automated penalties, weekly settlement every Sunday.

### Phase 5: Pauses & Approvals
> Reference: `REFERENCE.md` → Realtime

**Functionality:**
- Request pause for date range, partner must approve
- Full pause: no tracking, no penalties
- Payment pause: tracking continues (streaks) but no penalties
- Paused days visually indicated in daily view
- Unified approval inbox: habit deletions, pause requests, penalty changes

**Implementation:**
- Pause request form: date range picker (start/end date, must be today or future), radio/toggle for pause type (full vs payment-only)
- On submit: insert into `pauses` with `status = 'pending'`, insert into `approval_requests` with `type = 'pause'` and `reference_id = pause.id`, notify partner
- Unified approval inbox at `/approvals`: query `approval_requests` where the current user is the partner (not the requester) and `status = 'pending'`. Show request type, details, approve/deny buttons
- On approve: update `approval_requests.status` to `'approved'`, update the referenced record (pause status, habit status, or penalty amount depending on type)
- On deny: update to `'denied'`, notify requester
- Daily view updates: when rendering a date, check if an approved pause covers it. Full pause → grey out habits with "Paused" badge, don't show checkboxes. Payment pause → show habits normally but with "No penalty" indicator
- Realtime subscription on `approval_requests` so new requests appear instantly in inbox

**Test:**
- [ ] Requesting a full pause → partner sees it in approval inbox
- [ ] Requesting a payment-only pause → partner sees it in approval inbox
- [ ] Approving a pause → pause status updates, requester notified
- [ ] Denying a pause → requester notified, pause not applied
- [ ] Cannot request a pause with start date in the past
- [ ] Full pause active → daily view shows habits greyed out with "Paused" badge
- [ ] Payment-only pause active → habits shown normally with "No penalty" indicator
- [ ] Habit deletion approval → habit status changes to `deleted`, disappears from daily view
- [ ] Penalty change approval → new amount reflected for both users
- [ ] Approval inbox only shows requests where you are the partner (not the requester)
- [ ] Realtime: new approval request appears instantly in inbox

**Deliverable:** Pause system works, approvals flow correctly.

### Phase 6: Push & PWA
> Reference: `REFERENCE.md` → web-push, PWA, Vercel Cron

**Functionality:**
- Push notifications for: daily reminders, partner missed, settlement, pause/deletion requests, pair requests, 2-month habit reminder
- Installable PWA on mobile
- Offline habit logging — queue locally, sync when back online

**Implementation:**
- Generate VAPID keys (`npx web-push generate-vapid-keys`), store as env vars
- Server-side: configure `web-push` with VAPID details, create `sendPushNotification(userId, payload)` helper that reads `profiles.push_subscription` and calls `webpush.sendNotification()`. Handle 410/404 (expired) by nulling the subscription
- Client-side: on dashboard mount, check if push is supported → register service worker → `Notification.requestPermission()` → `pushManager.subscribe()` with VAPID public key → store subscription JSON in `profiles.push_subscription` via server action
- Service worker at `public/sw.js`: listen for `push` events → show notification. Listen for `notificationclick` → open the URL from payload data
- PWA manifest via `app/manifest.ts` with app name, icons, standalone display mode
- Daily reminders cron at `/api/cron/reminders`, runs hourly (`0 * * * *`): query habits where `reminder_time` hour matches current UTC hour (adjusted for user timezone stored in profile), send push to each user
- 2-month habit reminder: in the same cron, check `last_habit_added_date` — if > 60 days ago, send reminder
- Offline support: create a small IndexedDB store for pending check-offs. When offline, writes go to IndexedDB. On reconnect (`navigator.onLine` event or service worker sync), replay queued actions as server action calls. Conflict resolution: last-write-wins using `logged_at` timestamp
- In-app notification center at `/notifications`: list from `notifications` table, mark as read on tap

**Test:**
- [ ] Push permission prompt shown on first dashboard visit
- [ ] Granting permission → subscription saved to `profiles.push_subscription`
- [ ] Daily reminder push arrives at the habit's configured reminder time
- [ ] Settlement push notification arrives on Sunday evening
- [ ] Partner-missed push fires when partner misses a habit
- [ ] Pair request / pause request / deletion request → push sent to target user
- [ ] 2-month no-new-habit reminder fires when `last_habit_added_date` > 60 days
- [ ] Tapping a push notification opens the correct page in the app
- [ ] Expired subscription (410/404) → subscription nulled, no crash
- [ ] PWA installable on iOS Safari and Android Chrome
- [ ] App works in standalone mode (no browser chrome)
- [ ] Offline: checking off a habit while offline → queued in IndexedDB
- [ ] Coming back online → queued check-offs sync to server
- [ ] In-app notification center shows all notifications, marks as read on tap

**Deliverable:** Push notifications, installable PWA, offline support.

### Phase 7: Stats
> Reference: `REFERENCE.md` → Motion

**Functionality:**
- Streaks: current + longest per habit
- Weekly/monthly/all-time summaries (penalties, completion rates)
- Per-habit stats: completion rate, best/worst days
- Total money lost/earned

**Implementation:**
- Streak calculation: query `habit_logs` for a habit ordered by date desc, count consecutive `completed = true` rows for current streak. For longest streak, find the max consecutive run (can be a SQL window function or computed in JS)
- Weekly summary: aggregate `habit_logs` for current week — total habits due vs completed = completion rate. Sum penalties from settlement or running calculation
- Monthly/all-time: same pattern but wider date range. Query `settlements` for total money owed/earned across all pairs
- Per-habit analytics: group `habit_logs` by day-of-week, calculate completion rate per day to find best/worst performing days
- Dashboard home screen widgets: today's completion progress (X/Y habits done, progress ring animated with Motion `pathLength`), current week running balance, active streak counter for longest current streak
- Confetti animation on perfect days (all habits completed) using Motion

**Test:**
- [ ] Current streak increments with each consecutive completed day
- [ ] Breaking a streak resets current to 0
- [ ] Longest streak reflects the all-time max consecutive run
- [ ] Weekly completion rate = completed / total due for the week
- [ ] Monthly and all-time summaries aggregate correctly
- [ ] Per-habit best/worst day matches actual completion data by day-of-week
- [ ] Total money lost/earned matches sum of all settlements
- [ ] Dashboard progress ring shows correct X/Y for today
- [ ] Confetti animation triggers on a perfect day (all habits done)
- [ ] Confetti does not trigger if any habit is missed

**Deliverable:** Stats dashboard with animated visualizations.

### Phase 8: Polish
> Reference: `REFERENCE.md` → Tailwind CSS v4, Motion

**Functionality:**
- Dark mode (system preference + manual toggle)
- Micro-interactions throughout (check-off, hover/tap, page transitions)
- Mobile-first responsive design
- Accessibility (keyboard nav, screen reader, contrast)
- Error/loading states everywhere

**Implementation:**
- Dark mode: already prepped with Tailwind v4 `@custom-variant dark`. Add toggle button that sets `.dark` class on `<html>` and persists choice to `localStorage`. Default to system preference via `prefers-color-scheme` media query
- Motion micro-interactions: `whileHover={{ scale: 1.05 }}` and `whileTap={{ scale: 0.95 }}` on buttons/cards. Layout animations with `layout` prop on list items for smooth reordering. Page transitions with `AnimatePresence`
- Responsive audit: test all pages at 320px, 375px, 768px, 1024px breakpoints. Ensure bottom tab bar doesn't overlap content, forms are usable on small screens
- Performance: use server components for all data fetching pages, `"use client"` only for interactive bits. Lazy-load heavy components (stats charts) with `dynamic()`
- Loading states: skeleton components matching layout of real content. Error boundaries at route level with friendly fallback UI. Toast notifications for action confirmations/errors

**Test:**
- [ ] Dark mode toggle persists across sessions (localStorage)
- [ ] Defaults to system preference when no manual choice saved
- [ ] All pages readable in both light and dark mode (contrast check)
- [ ] Button hover/tap animations feel responsive (no lag)
- [ ] List reordering animations are smooth
- [ ] Page transitions work with AnimatePresence (no flicker)
- [ ] All pages usable at 320px, 375px, 768px, 1024px widths
- [ ] Bottom tab bar doesn't overlap page content on mobile
- [ ] Keyboard navigation works through all interactive elements
- [ ] Screen reader announces form labels, buttons, and status changes
- [ ] Loading skeletons shown while data fetches
- [ ] Error boundary catches route-level errors with friendly fallback
- [ ] Toast notifications appear for action confirmations and errors
- [ ] No layout shift on page load (server components for data fetching)

**Deliverable:** Production-ready app.

## Out of Scope
Payment integration, group accountability (3+), social feed, AI suggestions, leaderboards.

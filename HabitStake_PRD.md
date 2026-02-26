# Product Requirements Document (PRD)
# HabitStake — Accountability Habit Tracker

**Version:** 1.0
**Date:** February 26, 2026
**Stack:** Next.js (PWA) + Supabase
**Built with:** Claude Code

---

## 1. Overview

HabitStake is a progressive web app where two people form an accountability pair to track daily habits. If either person misses any of their habits on a given day, they owe their partner a configurable penalty (default $1.50). At the end of each week (Sunday evening), the app calculates the net balance and tells each person how much they owe. Payments are handled externally (e.g., Revolut).

---

## 2. Core Concepts

| Concept | Definition |
|---|---|
| **Pair** | Two users linked together for mutual accountability |
| **Habit** | A trackable action owned by one user, with a custom schedule and reminder time |
| **Penalty** | A flat fee per missed day (configurable per pair, default €1.50) |
| **Settlement** | End-of-week (Sunday evening) net balance summary |
| **Pause** | A date range during which tracking and/or penalties are suspended, requiring partner approval |

---

## 3. User Stories

### 3.1 Authentication
- As a user, I can sign up / log in with **Google** or **Apple ID** via Supabase Auth.
- As a user, I am onboarded with a brief setup flow after first login (name, profile picture).

### 3.2 Pairing
- As a user, I can search for other users in the app by name/username.
- As a user, I can send a pair request to another user.
- As a user, I can accept or decline incoming pair requests.
- As a user, I can be part of **multiple pairs** (each pair is independent).

### 3.3 Habits
- As a user, I can create a habit with:
  - **Name** (e.g., "Meditate", "Go to gym")
  - **Active days** (e.g., Mon/Wed/Fri, or every day)
  - **Reminder time** (e.g., 7:00 AM) — triggers a push notification
  - **Start date** (defaults to today, editable)
- As a user, I can edit a habit's name, schedule, or reminder time.
- As a user, I can request to **delete** a habit — my partner must approve the deletion.
- As a user, I can add habits at any time (no restrictions).

### 3.4 Habit Addition Reminders
- The app tracks the date each user last added a habit.
- **2 months after the last habit was added**, the app sends a reminder notification: "Time to level up! Consider adding a new habit."
- The "last habit added" date is editable by the user (in case they want to adjust the reminder cycle).

### 3.5 Daily Tracking
- As a user, I see a daily view of my habits (only habits scheduled for today).
- As a user, I can mark each habit as **done** or leave it unmarked (self-report).
- As a user, I can retroactively mark habits for past days (within the current week only).
- Habits not marked by end of day (midnight, user's local time) are considered **missed**.
- If **any** habit is missed on a given day → flat penalty for that day.

### 3.6 Penalty & Settlement
- Penalty amount is configurable per pair (set during pair setup, editable by either user with partner approval).
- **Every Sunday evening** (configurable time, default 8:00 PM local):
  - The app calculates each person's total penalties for the week.
  - Net balance is computed (e.g., "You owe Alex €4.50" or "Alex owes you €3.00").
  - **In-app summary screen** is surfaced.
  - **Push notification** is sent to both users.
- Payments are handled externally — the app only shows the balance, not processes payment.

### 3.7 Pausing
- As a user, I can request a **pause** for a specific date range.
- Pause has two modes:
  - **Full pause** — habits are not tracked, no penalties.
  - **Payment pause** — habits are still tracked (for streaks/stats) but no penalties are incurred.
- Partner must **approve** the pause request via notification.
- Paused days are visually indicated in the UI.

### 3.8 Stats & Insights
- **Streaks** — Current and longest streak per habit.
- **Weekly summary** — Total penalties incurred, habits completed vs. missed.
- **Monthly summary** — Aggregated stats, trends.
- **All-time stats** — Total money lost, total money earned, overall completion rate.
- **Per-habit stats** — Completion rate, best/worst days.

### 3.9 Notifications
| Trigger | Notification |
|---|---|
| Daily habit reminder | "Don't forget: [Habit Name]" at configured time |
| Partner missed a habit | "Alex missed a habit today" (next morning) |
| End-of-week settlement | "Weekly summary: You owe Alex €4.50" |
| Pause request received | "Alex requested a pause (Mar 5–8). Approve?" |
| Habit deletion request | "Alex wants to remove 'Meditate'. Approve?" |
| 2-month habit reminder | "It's been 2 months — time to add a new habit!" |
| Pair request received | "Alex wants to be your accountability partner" |

---

## 4. Technical Architecture

### 4.1 Frontend — Next.js (PWA)
- **App Router** with server components where possible.
- **PWA manifest + service worker** for installability and offline support.
- **Offline support:**
  - Habits can be marked as done while offline.
  - Changes are queued locally (IndexedDB or localStorage) and synced when back online.
  - Conflict resolution: last-write-wins with timestamp.
- **Push notifications** via Web Push API (VAPID keys stored in Supabase).
- **Responsive design** — mobile-first, looks great on phones.
- **UI:** Clean, modern, motivational. Claude Code will design this. Think: satisfying check-off animations, progress rings, clean typography.

### 4.2 Backend — Supabase
- **Auth:** Google + Apple OAuth providers.
- **Database (Postgres):** All data stored in Supabase tables.
- **Realtime:** Supabase Realtime subscriptions for live updates (partner activity, approvals).
- **Edge Functions:** For scheduled jobs (weekly settlement calculation, reminder triggers).
- **Row Level Security (RLS):** Users can only read/write their own data and data from their pairs.

### 4.3 Database Schema (Draft)

```
users
  - id (uuid, PK)
  - email
  - display_name
  - avatar_url
  - created_at
  - push_subscription (jsonb, nullable)

pairs
  - id (uuid, PK)
  - user_a (FK → users)
  - user_b (FK → users)
  - penalty_amount (decimal, default 1.50)
  - status (enum: pending, active, archived)
  - created_at

habits
  - id (uuid, PK)
  - user_id (FK → users)
  - pair_id (FK → pairs)
  - name (text)
  - active_days (integer[] — 0=Sun, 1=Mon, ..., 6=Sat)
  - reminder_time (time)
  - created_at
  - last_habit_added_date (date, editable — for 2-month reminder calc)
  - status (enum: active, pending_deletion, deleted)

habit_logs
  - id (uuid, PK)
  - habit_id (FK → habits)
  - date (date)
  - completed (boolean)
  - logged_at (timestamp)

pauses
  - id (uuid, PK)
  - pair_id (FK → pairs)
  - requested_by (FK → users)
  - start_date (date)
  - end_date (date)
  - pause_type (enum: full, payment_only)
  - status (enum: pending, approved, denied)
  - created_at

settlements
  - id (uuid, PK)
  - pair_id (FK → pairs)
  - week_start (date)
  - week_end (date)
  - user_a_penalties (decimal)
  - user_b_penalties (decimal)
  - net_owed_by (FK → users, nullable)
  - net_amount (decimal)
  - created_at

notifications
  - id (uuid, PK)
  - user_id (FK → users)
  - type (enum)
  - title (text)
  - body (text)
  - read (boolean, default false)
  - data (jsonb, nullable)
  - created_at

approval_requests
  - id (uuid, PK)
  - pair_id (FK → pairs)
  - requested_by (FK → users)
  - type (enum: habit_deletion, pause, penalty_change)
  - reference_id (uuid — points to habit/pause/etc.)
  - status (enum: pending, approved, denied)
  - created_at
```

### 4.4 Key Flows

**Daily Penalty Calculation (per user, per pair, per day):**
1. Get all active habits for user in this pair, scheduled for this day.
2. Check if any are not marked as completed.
3. If yes → 1 × penalty_amount charged for that day.
4. Check if a pause (full or payment_only) covers this day.
   - Full pause → no penalty, no tracking required.
   - Payment pause → log tracking but $0 penalty.

**Weekly Settlement (Sunday evening cron):**
1. For each active pair, sum daily penalties for user_a and user_b (Mon–Sun).
2. Compute net: net = user_a_penalties - user_b_penalties.
3. Store in settlements table.
4. Send push notification + in-app notification to both users.

---

## 5. MVP Scope (v1.0)

### In Scope
- Google + Apple auth
- Pair system (search + request)
- Habit CRUD with schedules + reminders
- Daily self-report tracking
- Flat penalty per missed day
- Weekly settlement summary (Sunday evening)
- Pause requests (full + payment-only)
- Habit deletion approval
- Push notifications (all types listed above)
- Stats: streaks, weekly summary, all-time money owed
- Offline habit logging with sync
- PWA installable on mobile

### Out of Scope (Future)
- Payment integration (Revolut/Venmo API)
- Group accountability (3+ people)
- Social feed / activity log
- Habit categories or tagging
- AI-powered habit suggestions
- Leaderboards

---

## 6. Success Metrics
- Both users log habits daily (>90% logging rate).
- Weekly settlements are generated on time every Sunday.
- Notifications are delivered reliably.
- App loads in <2s and works offline.

---

## 7. Design Direction
- **Mobile-first**, clean, minimal.
- Satisfying micro-interactions (check-off animations, confetti on perfect days).
- Dashboard-style home screen: today's habits, current week balance, streak counter.
- Dark mode support.
- Think: a mix of Streaks app + Splitwise aesthetics.

---

## 8. Deployment
- **Frontend:** Vercel (natural fit for Next.js).
- **Backend:** Supabase (hosted).
- **Domain:** TBD.
- **CI/CD:** Vercel auto-deploys from GitHub main branch.

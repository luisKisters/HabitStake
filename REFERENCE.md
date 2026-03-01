# HabitStake — Technical Reference

Code examples, library APIs, and setup patterns. Consult when implementing specific features.

## Supabase Setup

### Env vars
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (accessible client + server)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (accessible client + server)
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-only, bypasses RLS)

### Server Client
```typescript
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

### Browser Client
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Auth
```typescript
// Sign in
const supabase = createClient()
await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${origin}/auth/callback` } })
```

```typescript
// app/auth/callback/route.ts
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(`${origin}/dashboard`)
}
```

### Middleware
```typescript
// middleware.ts
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  return response
}
```

### Realtime
```typescript
const supabase = createClient()
supabase
  .channel("pair-updates")
  .on("postgres_changes", { event: "*", schema: "public", table: "habit_logs", filter: `pair_id=eq.${pairId}` },
    (payload) => { /* handle realtime update */ }
  )
  .subscribe()
```

### RLS Policies
```sql
-- Users can only see habits in their pairs
CREATE POLICY "Users see own pair habits" ON habits
  FOR SELECT USING (
    pair_id IN (
      SELECT id FROM pairs WHERE user_a = auth.uid() OR user_b = auth.uid()
    )
  );
```

## Tailwind CSS v4

- Dark mode config in CSS (no tailwind.config.js):
  ```css
  @import "tailwindcss";
  @custom-variant dark (&:where(.dark, .dark *));
  ```
- Toggle: add/remove `.dark` class on `<html>`

## Motion

- Import: `import { motion } from "motion/react"` (NOT `framer-motion`)
- Check-off: `<motion.button whileTap={{ scale: 0.95 }} animate={done ? { scale: [1, 1.2, 1] } : {}} />`
- Progress ring: `<motion.circle initial={{ pathLength: 0 }} animate={{ pathLength: rate }} />`
- Layout: `<motion.div layout />` for automatic layout animations

## web-push

```typescript
import webpush from "web-push"

webpush.setVapidDetails("mailto:support@habitstake.app", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!)

// Send
await webpush.sendNotification(subscription, JSON.stringify({ title, body, url }))
// Status 410/404 = expired subscription → remove it
```

Generate keys: `npx web-push generate-vapid-keys`

## PWA

### Manifest
```typescript
// app/manifest.ts
import type { MetadataRoute } from "next"
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HabitStake", short_name: "HabitStake",
    start_url: "/", display: "standalone",
    background_color: "#ffffff", theme_color: "#000000",
    icons: [
      { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
```

### Service Worker
```javascript
// public/sw.js
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(self.registration.showNotification(data.title || "HabitStake", {
    body: data.body, icon: "/icon-192x192.png",
    data: { url: data.url || "/" },
  }))
})
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"))
})
```

## Vercel Cron

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/settlement", "schedule": "0 20 * * 0" },
    { "path": "/api/cron/reminders", "schedule": "0 * * * *" }
  ]
}
```

Protect with: `request.headers.get("authorization") === \`Bearer ${process.env.CRON_SECRET}\``

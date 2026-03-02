import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushNotification } from "@/lib/push";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const nowUtc = new Date();
  const currentHour = nowUtc.getUTCHours();
  const today = nowUtc.toISOString().slice(0, 10);
  const todayDayNumber = nowUtc.getUTCDay(); // 0=Sun, 1=Mon ... 6=Sat

  let remindersSent = 0;

  // --- Daily habit reminders ---
  // Find active habits with a reminder_time whose hour matches the current UTC hour,
  // scheduled for today, not yet completed, and not paused.
  const { data: habits } = await admin
    .from("habits")
    .select("id, user_id, name, pair_id, reminder_time")
    .eq("status", "active")
    .lte("start_date", today)
    .filter("active_days", "cs", `{${todayDayNumber}}`)
    .not("reminder_time", "is", null);

  if (habits) {
    for (const habit of habits) {
      // Parse reminder hour from time string "HH:MM:SS"
      const reminderHour = parseInt(habit.reminder_time.split(":")[0], 10);
      if (reminderHour !== currentHour) continue;

      // Check if already completed today
      const { data: log } = await admin
        .from("habit_logs")
        .select("id, completed")
        .eq("habit_id", habit.id)
        .eq("date", today)
        .maybeSingle();

      if (log?.completed) continue;

      // Check for active full pause
      const { data: pause } = await admin
        .from("pauses")
        .select("id")
        .eq("pair_id", habit.pair_id)
        .eq("status", "approved")
        .eq("pause_type", "full")
        .lte("start_date", today)
        .gte("end_date", today)
        .maybeSingle();

      if (pause) continue;

      // Insert in-app notification
      await admin.from("notifications").insert({
        user_id: habit.user_id,
        type: "reminder",
        title: "Habit reminder",
        body: `Don't forget: ${habit.name}`,
        data: { habit_id: habit.id },
      });

      // Send push notification
      await sendPushNotification(habit.user_id, {
        title: "Habit reminder",
        body: `Don't forget: ${habit.name}`,
        url: "/dashboard",
      });

      remindersSent++;
    }
  }

  // --- 2-month no-new-habit reminder ---
  // Find users whose most recent habit was added >60 days ago.
  const sixtyDaysAgo = new Date(nowUtc);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().slice(0, 10);

  // Only run this check once a day (at 09:00 UTC)
  if (currentHour === 9) {
    const { data: stalePairs } = await admin
      .from("habits")
      .select("user_id, last_habit_added_date")
      .eq("status", "active")
      .lt("last_habit_added_date", sixtyDaysAgoStr)
      .not("last_habit_added_date", "is", null);

    // Deduplicate by user
    const seenUsers = new Set<string>();
    for (const row of stalePairs ?? []) {
      if (seenUsers.has(row.user_id)) continue;
      seenUsers.add(row.user_id);

      await admin.from("notifications").insert({
        user_id: row.user_id,
        type: "habit_reminder",
        title: "Time to add a new habit?",
        body: "It's been 2 months since you last added a habit. Keep the streak going!",
        data: {},
      });

      await sendPushNotification(row.user_id, {
        title: "Time to add a new habit?",
        body: "It's been 2 months since you last added a habit. Keep the streak going!",
        url: "/pairs",
      });
    }
  }

  return Response.json({ remindersSent });
}

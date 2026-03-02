import type { SupabaseClient } from "@supabase/supabase-js";

export type DayPenaltyResult = {
  missed: boolean;
  penaltyAmount: number;
};

export type WeekPenaltyResult = {
  totalPenalty: number;
  missedDays: string[];
};

export async function calculateDayPenalty(
  userId: string,
  pairId: string,
  date: string, // YYYY-MM-DD
  adminClient: SupabaseClient,
): Promise<DayPenaltyResult> {
  const dayOfWeek = new Date(date + "T00:00:00").getDay(); // 0=Sun, 1=Mon …

  // 1. Get active habits for this user in this pair on this day
  const { data: habitsRaw } = await adminClient
    .from("habits")
    .select("id, active_days")
    .eq("pair_id", pairId)
    .eq("user_id", userId)
    .eq("status", "active")
    .lte("start_date", date);

  const habits = (habitsRaw ?? []).filter((h: { id: string; active_days: number[] }) =>
    h.active_days.includes(dayOfWeek),
  );

  // 2. No habits scheduled → no penalty
  if (habits.length === 0) return { missed: false, penaltyAmount: 0 };

  // 3. Check habit logs — any completed?
  const habitIds = habits.map((h: { id: string }) => h.id);
  const { data: logs } = await adminClient
    .from("habit_logs")
    .select("habit_id, completed")
    .in("habit_id", habitIds)
    .eq("date", date);

  const completedSet = new Set(
    (logs ?? [])
      .filter((l: { habit_id: string; completed: boolean }) => l.completed)
      .map((l: { habit_id: string; completed: boolean }) => l.habit_id),
  );

  const allCompleted = habitIds.every((id: string) => completedSet.has(id));
  if (allCompleted) return { missed: false, penaltyAmount: 0 };

  // 4. Check for approved pauses covering this date
  const { data: pauseRaw } = await adminClient
    .from("pauses")
    .select("pause_type")
    .eq("pair_id", pairId)
    .eq("status", "approved")
    .lte("start_date", date)
    .gte("end_date", date)
    .maybeSingle();

  if (pauseRaw) {
    if (pauseRaw.pause_type === "full") return { missed: false, penaltyAmount: 0 };
    if (pauseRaw.pause_type === "payment_only") return { missed: true, penaltyAmount: 0 };
  }

  // 5. Get penalty amount from pair
  const { data: pair } = await adminClient
    .from("pairs")
    .select("penalty_amount")
    .eq("id", pairId)
    .single();

  return { missed: true, penaltyAmount: pair?.penalty_amount ?? 0 };
}

export async function calculateWeekPenalties(
  userId: string,
  pairId: string,
  weekStart: string, // YYYY-MM-DD (Monday)
  weekEnd: string, // YYYY-MM-DD (Sunday)
  adminClient: SupabaseClient,
): Promise<WeekPenaltyResult> {
  const missedDays: string[] = [];
  let totalPenalty = 0;

  const current = new Date(weekStart + "T00:00:00");
  const end = new Date(weekEnd + "T00:00:00");

  while (current <= end) {
    const date = current.toISOString().slice(0, 10);
    const result = await calculateDayPenalty(userId, pairId, date, adminClient);
    if (result.missed) {
      missedDays.push(date);
      totalPenalty += result.penaltyAmount;
    }
    current.setDate(current.getDate() + 1);
  }

  return { totalPenalty, missedDays };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { getActivePair } from "@/lib/actions/habits";

export type HabitStat = {
  id: string;
  name: string;
  active_days: number[];
  start_date: string;
  completionRate: number; // 0–100
  streak: { current: number; longest: number };
  bestDay: number | null; // 0=Sun…6=Sat
  worstDay: number | null;
};

export type AllTimeStats = {
  totalMoneyLost: number;
  totalMoneyEarned: number;
  overallCompletionRate: number;
};

export type TodayProgress = { completed: number; due: number };

// ─── Private helpers ─────────────────────────────────────────────────────────

type Log = { date: string; completed: boolean };

function computeStreak(
  logs: Log[],
  activeDays: number[],
  startDate: string,
): { current: number; longest: number } {
  if (activeDays.length === 0) return { current: 0, longest: 0 };

  const completedSet = new Set(
    logs.filter((l) => l.completed).map((l) => l.date),
  );

  // Build list of all scheduled dates from startDate to today
  const today = new Date().toISOString().slice(0, 10);
  const scheduledDates: string[] = [];
  const cursor = new Date(startDate + "T00:00:00");
  const end = new Date(today + "T00:00:00");

  while (cursor <= end) {
    const dow = cursor.getDay();
    if (activeDays.includes(dow)) {
      scheduledDates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  if (scheduledDates.length === 0) return { current: 0, longest: 0 };

  // Current streak: walk backwards from last scheduled date
  let current = 0;
  for (let i = scheduledDates.length - 1; i >= 0; i--) {
    if (completedSet.has(scheduledDates[i])) {
      current++;
    } else {
      break;
    }
  }

  // Longest streak: walk forward tracking running max
  let longest = 0;
  let running = 0;
  for (const d of scheduledDates) {
    if (completedSet.has(d)) {
      running++;
      if (running > longest) longest = running;
    } else {
      running = 0;
    }
  }

  return { current, longest };
}

function computeCompletionRate(logs: Log[]): number {
  if (logs.length === 0) return 0;
  const completed = logs.filter((l) => l.completed).length;
  return Math.round((completed / logs.length) * 100);
}

function computeBestWorstDay(
  logs: Log[],
  activeDays: number[],
): { bestDay: number | null; worstDay: number | null } {
  const dayStats = new Map<number, { completed: number; total: number }>();

  for (const dow of activeDays) {
    dayStats.set(dow, { completed: 0, total: 0 });
  }

  for (const log of logs) {
    const dow = new Date(log.date + "T00:00:00").getDay();
    const stat = dayStats.get(dow);
    if (stat) {
      stat.total++;
      if (log.completed) stat.completed++;
    }
  }

  const daysWithData = Array.from(dayStats.entries())
    .filter(([, s]) => s.total > 0)
    .map(([dow, s]) => ({ dow, rate: s.completed / s.total }));

  if (daysWithData.length === 0) return { bestDay: null, worstDay: null };

  daysWithData.sort((a, b) => b.rate - a.rate);
  return {
    bestDay: daysWithData[0].dow,
    worstDay: daysWithData[daysWithData.length - 1].dow,
  };
}

// ─── Public server actions ────────────────────────────────────────────────────

export async function getHabitStats(): Promise<HabitStat[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const pair = await getActivePair();
  if (!pair) return [];

  const { data: habits } = await supabase
    .from("habits")
    .select("id, name, active_days, start_date")
    .eq("user_id", user.id)
    .eq("pair_id", pair.id)
    .in("status", ["active", "pending_deletion"])
    .order("created_at", { ascending: true });

  if (!habits || habits.length === 0) return [];

  const ids = habits.map((h) => h.id);
  const { data: logsRaw } = await supabase
    .from("habit_logs")
    .select("habit_id, date, completed")
    .in("habit_id", ids);

  const logsByHabit = new Map<string, Log[]>();
  for (const id of ids) logsByHabit.set(id, []);
  for (const log of logsRaw ?? []) {
    logsByHabit.get(log.habit_id)?.push({ date: log.date, completed: log.completed });
  }

  return habits.map((h) => {
    const logs = logsByHabit.get(h.id) ?? [];
    const streak = computeStreak(logs, h.active_days, h.start_date);
    const completionRate = computeCompletionRate(logs);
    const { bestDay, worstDay } = computeBestWorstDay(logs, h.active_days);
    return {
      id: h.id,
      name: h.name,
      active_days: h.active_days,
      start_date: h.start_date,
      completionRate,
      streak,
      bestDay,
      worstDay,
    };
  });
}

export async function getAllTimeStats(): Promise<AllTimeStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { totalMoneyLost: 0, totalMoneyEarned: 0, overallCompletionRate: 0 };

  const pair = await getActivePair();
  if (!pair)
    return { totalMoneyLost: 0, totalMoneyEarned: 0, overallCompletionRate: 0 };

  const isUserA = pair.user_a === user.id;

  const { data: settlements } = await supabase
    .from("settlements")
    .select("user_a_penalties, user_b_penalties")
    .eq("pair_id", pair.id);

  let totalMoneyLost = 0;
  let totalMoneyEarned = 0;

  for (const s of settlements ?? []) {
    const myPenalties = isUserA ? s.user_a_penalties : s.user_b_penalties;
    const partnerPenalties = isUserA ? s.user_b_penalties : s.user_a_penalties;
    totalMoneyLost += myPenalties;
    totalMoneyEarned += partnerPenalties;
  }

  // Overall completion rate across all habits (all statuses)
  const { data: allHabits } = await supabase
    .from("habits")
    .select("id")
    .eq("user_id", user.id)
    .eq("pair_id", pair.id);

  let overallCompletionRate = 0;
  if (allHabits && allHabits.length > 0) {
    const allIds = allHabits.map((h) => h.id);
    const { data: allLogs } = await supabase
      .from("habit_logs")
      .select("completed")
      .in("habit_id", allIds);

    overallCompletionRate = computeCompletionRate(
      (allLogs ?? []).map((l) => ({ date: "", completed: l.completed })),
    );
  }

  return { totalMoneyLost, totalMoneyEarned, overallCompletionRate };
}

export async function getTodayProgress(): Promise<TodayProgress> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { completed: 0, due: 0 };

  const pair = await getActivePair();
  if (!pair) return { completed: 0, due: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const dayOfWeek = new Date(today + "T00:00:00").getDay();

  const { data: habits } = await supabase
    .from("habits")
    .select("id, active_days")
    .eq("user_id", user.id)
    .eq("pair_id", pair.id)
    .eq("status", "active")
    .lte("start_date", today);

  const dueHabits = (habits ?? []).filter((h) =>
    h.active_days.includes(dayOfWeek),
  );

  if (dueHabits.length === 0) return { completed: 0, due: 0 };

  const dueIds = dueHabits.map((h) => h.id);
  const { data: logs } = await supabase
    .from("habit_logs")
    .select("habit_id, completed")
    .in("habit_id", dueIds)
    .eq("date", today);

  const completedCount = (logs ?? []).filter((l) => l.completed).length;

  return { completed: completedCount, due: dueHabits.length };
}

export async function getLongestCurrentStreak(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const pair = await getActivePair();
  if (!pair) return 0;

  const { data: habits } = await supabase
    .from("habits")
    .select("id, active_days, start_date")
    .eq("user_id", user.id)
    .eq("pair_id", pair.id)
    .eq("status", "active");

  if (!habits || habits.length === 0) return 0;

  const ids = habits.map((h) => h.id);
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const { data: logsRaw } = await supabase
    .from("habit_logs")
    .select("habit_id, date, completed")
    .in("habit_id", ids)
    .gte("date", cutoffDate);

  const logsByHabit = new Map<string, Log[]>();
  for (const id of ids) logsByHabit.set(id, []);
  for (const log of logsRaw ?? []) {
    logsByHabit.get(log.habit_id)?.push({ date: log.date, completed: log.completed });
  }

  let max = 0;
  for (const h of habits) {
    const logs = logsByHabit.get(h.id) ?? [];
    const { current } = computeStreak(logs, h.active_days, h.start_date);
    if (current > max) max = current;
  }

  return max;
}

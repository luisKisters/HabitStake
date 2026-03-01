"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type HabitWithLog = {
  id: string;
  name: string;
  active_days: number[];
  reminder_time: string | null;
  start_date: string;
  user_id: string;
  pair_id: string;
  status: string;
  log: { completed: boolean } | null;
};

export type ActivePair = {
  id: string;
  user_a: string;
  user_b: string;
  penalty_amount: number;
};

export async function getActivePair(): Promise<ActivePair | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("pairs")
    .select("id, user_a, user_b, penalty_amount")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .eq("status", "active")
    .maybeSingle();

  return data ?? null;
}

export async function getDailyData(date: string): Promise<{
  myHabits: HabitWithLog[];
  partnerHabits: HabitWithLog[];
  pair: ActivePair | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { myHabits: [], partnerHabits: [], pair: null };

  const pair = await getActivePair();
  if (!pair) return { myHabits: [], partnerHabits: [], pair: null };

  // dayOfWeek: 0=Sun, 1=Mon … 6=Sat (JS convention matches active_days encoding)
  const dayOfWeek = new Date(date + "T00:00:00").getDay();

  const { data: habitsRaw } = await supabase
    .from("habits")
    .select("id, name, active_days, reminder_time, start_date, user_id, pair_id, status")
    .eq("pair_id", pair.id)
    .eq("status", "active")
    .lte("start_date", date);

  const habits = (habitsRaw ?? []).filter((h) =>
    h.active_days.includes(dayOfWeek),
  );

  if (habits.length === 0) return { myHabits: [], partnerHabits: [], pair };

  const habitIds = habits.map((h) => h.id);
  const { data: logs } = await supabase
    .from("habit_logs")
    .select("habit_id, completed")
    .in("habit_id", habitIds)
    .eq("date", date);

  const logMap = new Map(
    (logs ?? []).map((l) => [l.habit_id, { completed: l.completed }]),
  );

  const toHabitWithLog = (h: (typeof habits)[0]): HabitWithLog => ({
    id: h.id,
    name: h.name,
    active_days: h.active_days,
    reminder_time: h.reminder_time,
    start_date: h.start_date,
    user_id: h.user_id,
    pair_id: h.pair_id,
    status: h.status,
    log: logMap.get(h.id) ?? null,
  });

  const myHabits = habits
    .filter((h) => h.user_id === user.id)
    .map(toHabitWithLog);
  const partnerHabits = habits
    .filter((h) => h.user_id !== user.id)
    .map(toHabitWithLog);

  return { myHabits, partnerHabits, pair };
}

export async function createHabit(data: {
  name: string;
  active_days: number[];
  reminder_time: string | null;
  start_date: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const pair = await getActivePair();
  if (!pair) return { error: "No active pair found. Pair up first." };

  if (!data.name.trim()) return { error: "Habit name is required." };
  if (data.active_days.length === 0)
    return { error: "Select at least one day." };

  const { error } = await supabase.from("habits").insert({
    user_id: user.id,
    pair_id: pair.id,
    name: data.name.trim(),
    active_days: data.active_days,
    reminder_time: data.reminder_time || null,
    start_date: data.start_date,
    last_habit_added_date: new Date().toISOString().slice(0, 10),
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { error: null };
}

export async function updateHabit(
  habitId: string,
  data: {
    name?: string;
    active_days?: number[];
    reminder_time?: string | null;
    start_date?: string;
  },
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("habits")
    .update(data)
    .eq("id", habitId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { error: null };
}

export async function requestDeleteHabit(
  habitId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: habit } = await supabase
    .from("habits")
    .select("id, pair_id, user_id")
    .eq("id", habitId)
    .eq("user_id", user.id)
    .single();

  if (!habit) return { error: "Habit not found." };

  const { error: updateError } = await supabase
    .from("habits")
    .update({ status: "pending_deletion" })
    .eq("id", habitId)
    .eq("user_id", user.id);

  if (updateError) return { error: updateError.message };

  await supabase.from("approval_requests").insert({
    pair_id: habit.pair_id,
    requested_by: user.id,
    type: "habit_deletion",
    reference_id: habitId,
  });

  revalidatePath("/dashboard");
  return { error: null };
}

export async function toggleHabitLog(
  habitId: string,
  date: string,
  completed: boolean,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: habit } = await supabase
    .from("habits")
    .select("id")
    .eq("id", habitId)
    .eq("user_id", user.id)
    .single();

  if (!habit) return { error: "Habit not found." };

  const { error } = await supabase
    .from("habit_logs")
    .upsert({ habit_id: habitId, date, completed }, { onConflict: "habit_id,date" });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { error: null };
}

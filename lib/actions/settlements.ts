"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateDayPenalty, calculateWeekPenalties } from "@/lib/penalties";

export type Settlement = {
  id: string;
  pair_id: string;
  week_start: string;
  week_end: string;
  user_a_penalties: number;
  user_b_penalties: number;
  net_owed_by: string | null;
  net_amount: number;
  created_at: string;
  partner_name: string | null;
  i_owe: boolean; // true = current user owes partner
};

export type DayBreakdown = {
  date: string;
  my_missed: boolean;
  my_penalty: number;
  partner_missed: boolean;
  partner_penalty: number;
};

export type RunningBalance = {
  my_total: number;
  partner_total: number;
  net_amount: number;
  i_owe: boolean;
};

export async function getSettlements(pairId?: string): Promise<Settlement[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("settlements")
    .select(
      `id, pair_id, week_start, week_end, user_a_penalties, user_b_penalties, net_owed_by, net_amount, created_at,
       pair:pairs!settlements_pair_id_fkey(
         user_a, user_b,
         profile_a:profiles!pairs_user_a_fkey(id, display_name),
         profile_b:profiles!pairs_user_b_fkey(id, display_name)
       )`,
    )
    .order("week_start", { ascending: false });

  if (pairId) {
    query = query.eq("pair_id", pairId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => {
    const pair = Array.isArray(row.pair) ? row.pair[0] : row.pair;
    const isUserA = pair?.user_a === user.id;
    const partnerRaw = isUserA ? pair?.profile_b : pair?.profile_a;
    const partner = Array.isArray(partnerRaw) ? partnerRaw[0] : partnerRaw;
    return {
      id: row.id,
      pair_id: row.pair_id,
      week_start: row.week_start,
      week_end: row.week_end,
      user_a_penalties: row.user_a_penalties,
      user_b_penalties: row.user_b_penalties,
      net_owed_by: row.net_owed_by,
      net_amount: row.net_amount,
      created_at: row.created_at,
      partner_name: partner?.display_name ?? null,
      i_owe: row.net_owed_by === user.id,
    };
  });
}

export async function getSettlementById(
  id: string,
): Promise<{ settlement: Settlement; breakdown: DayBreakdown[] } | null> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: row, error } = await supabase
    .from("settlements")
    .select(
      `id, pair_id, week_start, week_end, user_a_penalties, user_b_penalties, net_owed_by, net_amount, created_at,
       pair:pairs!settlements_pair_id_fkey(
         user_a, user_b,
         profile_a:profiles!pairs_user_a_fkey(id, display_name),
         profile_b:profiles!pairs_user_b_fkey(id, display_name)
       )`,
    )
    .eq("id", id)
    .single();

  if (error || !row) return null;

  const pair = Array.isArray(row.pair) ? row.pair[0] : row.pair;
  if (!pair) return null;

  const isUserA = pair.user_a === user.id;
  const partnerId = isUserA ? pair.user_b : pair.user_a;
  const partnerRaw = isUserA ? pair.profile_b : pair.profile_a;
  const partner = Array.isArray(partnerRaw) ? partnerRaw[0] : partnerRaw;

  const settlement: Settlement = {
    id: row.id,
    pair_id: row.pair_id,
    week_start: row.week_start,
    week_end: row.week_end,
    user_a_penalties: row.user_a_penalties,
    user_b_penalties: row.user_b_penalties,
    net_owed_by: row.net_owed_by,
    net_amount: row.net_amount,
    created_at: row.created_at,
    partner_name: partner?.display_name ?? null,
    i_owe: row.net_owed_by === user.id,
  };

  // Build per-day breakdown
  const breakdown: DayBreakdown[] = [];
  const current = new Date(row.week_start + "T00:00:00");
  const end = new Date(row.week_end + "T00:00:00");

  while (current <= end) {
    const date = current.toISOString().slice(0, 10);
    const [mine, partners] = await Promise.all([
      calculateDayPenalty(user.id, row.pair_id, date, admin),
      calculateDayPenalty(partnerId, row.pair_id, date, admin),
    ]);
    breakdown.push({
      date,
      my_missed: mine.missed,
      my_penalty: mine.penaltyAmount,
      partner_missed: partners.missed,
      partner_penalty: partners.penaltyAmount,
    });
    current.setDate(current.getDate() + 1);
  }

  return { settlement, breakdown };
}

export async function getRunningBalance(pairId: string): Promise<RunningBalance | null> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: pair } = await supabase
    .from("pairs")
    .select("id, user_a, user_b")
    .eq("id", pairId)
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .single();

  if (!pair) return null;

  // Current week Mon–today
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  const weekStart = monday.toISOString().slice(0, 10);
  const weekEnd = today.toISOString().slice(0, 10);

  const isUserA = pair.user_a === user.id;
  const myId = user.id;
  const partnerId = isUserA ? pair.user_b : pair.user_a;

  const [mine, partners] = await Promise.all([
    calculateWeekPenalties(myId, pairId, weekStart, weekEnd, admin),
    calculateWeekPenalties(partnerId, pairId, weekStart, weekEnd, admin),
  ]);

  const diff = mine.totalPenalty - partners.totalPenalty;
  return {
    my_total: mine.totalPenalty,
    partner_total: partners.totalPenalty,
    net_amount: Math.abs(diff),
    i_owe: diff > 0,
  };
}

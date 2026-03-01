"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type PairStatus = "pending" | "active" | "archived";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type Pair = {
  id: string;
  user_a: string;
  user_b: string;
  penalty_amount: number;
  status: PairStatus;
  created_at: string;
  partner: Profile;
};

export async function searchUsers(query: string): Promise<Profile[]> {
  if (!query.trim()) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .ilike("display_name", `%${query}%`)
    .neq("id", user.id)
    .limit(10);

  if (error) return [];
  return data ?? [];
}

export async function sendPairRequest(
  targetUserId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Check if a pair already exists between these two users
  const { data: existing } = await supabase
    .from("pairs")
    .select("id, status")
    .or(
      `and(user_a.eq.${user.id},user_b.eq.${targetUserId}),and(user_a.eq.${targetUserId},user_b.eq.${user.id})`,
    )
    .not("status", "eq", "archived")
    .maybeSingle();

  if (existing) {
    if (existing.status === "pending") {
      return { error: "A pair request already exists with this user." };
    }
    if (existing.status === "active") {
      return { error: "You are already paired with this user." };
    }
  }

  const { error: insertError } = await supabase.from("pairs").insert({
    user_a: user.id,
    user_b: targetUserId,
    status: "pending",
  });

  if (insertError) return { error: insertError.message };

  // Insert notification for target user
  await supabase.from("notifications").insert({
    user_id: targetUserId,
    type: "pair_request",
    title: "New pair request",
    body: "Someone wants to pair up with you!",
    data: { from_user_id: user.id },
  });

  revalidatePath("/pairs");
  return { error: null };
}

export async function respondToPairRequest(
  pairId: string,
  accept: boolean,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const newStatus = accept ? "active" : "archived";

  const { data: pair, error: fetchError } = await supabase
    .from("pairs")
    .select("user_a, user_b")
    .eq("id", pairId)
    .eq("user_b", user.id) // Only the recipient can respond
    .eq("status", "pending")
    .single();

  if (fetchError || !pair) return { error: "Pair request not found." };

  const { error: updateError } = await supabase
    .from("pairs")
    .update({ status: newStatus })
    .eq("id", pairId);

  if (updateError) return { error: updateError.message };

  // Notify the requester
  await supabase.from("notifications").insert({
    user_id: pair.user_a,
    type: accept ? "pair_accepted" : "pair_declined",
    title: accept ? "Pair request accepted!" : "Pair request declined",
    body: accept
      ? "Your pair request was accepted."
      : "Your pair request was declined.",
    data: { pair_id: pairId },
  });

  revalidatePath("/pairs");
  return { error: null };
}

export async function updatePenaltyAmount(
  pairId: string,
  amount: number,
): Promise<{ error: string | null }> {
  if (amount <= 0) return { error: "Amount must be greater than 0." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("pairs")
    .update({ penalty_amount: amount })
    .eq("id", pairId)
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

  if (error) return { error: error.message };

  revalidatePath("/pairs");
  return { error: null };
}

export async function getPairs(): Promise<{
  active: Pair[];
  incoming: Pair[];
  outgoing: Pair[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { active: [], incoming: [], outgoing: [] };

  const { data: pairs, error } = await supabase
    .from("pairs")
    .select(
      `id, user_a, user_b, penalty_amount, status, created_at,
       profile_a:profiles!pairs_user_a_fkey(id, display_name, avatar_url),
       profile_b:profiles!pairs_user_b_fkey(id, display_name, avatar_url)`,
    )
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .not("status", "eq", "archived")
    .order("created_at", { ascending: false });

  if (error || !pairs) return { active: [], incoming: [], outgoing: [] };

  const toDisplayPair = (row: (typeof pairs)[0]): Pair => {
    const isUserA = row.user_a === user.id;
    const partnerRaw = isUserA ? row.profile_b : row.profile_a;
    // Supabase returns joined profile as object or array — normalise
    const partner = Array.isArray(partnerRaw) ? partnerRaw[0] : partnerRaw;
    return {
      id: row.id,
      user_a: row.user_a,
      user_b: row.user_b,
      penalty_amount: row.penalty_amount,
      status: row.status as PairStatus,
      created_at: row.created_at,
      partner: partner ?? { id: "", display_name: null, avatar_url: null },
    };
  };

  const active: Pair[] = [];
  const incoming: Pair[] = [];
  const outgoing: Pair[] = [];

  for (const row of pairs) {
    const pair = toDisplayPair(row);
    if (pair.status === "active") {
      active.push(pair);
    } else if (pair.status === "pending") {
      if (row.user_b === user.id) {
        incoming.push(pair);
      } else {
        outgoing.push(pair);
      }
    }
  }

  return { active, incoming, outgoing };
}

export async function getPairById(pairId: string): Promise<Pair | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: row, error } = await supabase
    .from("pairs")
    .select(
      `id, user_a, user_b, penalty_amount, status, created_at,
       profile_a:profiles!pairs_user_a_fkey(id, display_name, avatar_url),
       profile_b:profiles!pairs_user_b_fkey(id, display_name, avatar_url)`,
    )
    .eq("id", pairId)
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .single();

  if (error || !row) return null;

  const isUserA = row.user_a === user.id;
  const partnerRaw = isUserA ? row.profile_b : row.profile_a;
  const partner = Array.isArray(partnerRaw) ? partnerRaw[0] : partnerRaw;

  return {
    id: row.id,
    user_a: row.user_a,
    user_b: row.user_b,
    penalty_amount: row.penalty_amount,
    status: row.status as PairStatus,
    created_at: row.created_at,
    partner: partner ?? { id: "", display_name: null, avatar_url: null },
  };
}

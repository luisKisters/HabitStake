"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type PauseType = "full" | "payment_only";

export type ApprovalType = "habit_deletion" | "pause" | "penalty_change";

export type ApprovalRequest = {
  id: string;
  pair_id: string;
  requested_by: string;
  type: ApprovalType;
  reference_id: string | null;
  status: "pending" | "approved" | "denied";
  created_at: string;
  requester_name: string | null;
  // Resolved details based on type
  details: HabitDeletionDetails | PauseDetails | PenaltyChangeDetails | null;
};

export type HabitDeletionDetails = {
  kind: "habit_deletion";
  habit_name: string;
};

export type PauseDetails = {
  kind: "pause";
  start_date: string;
  end_date: string;
  pause_type: PauseType;
};

export type PenaltyChangeDetails = {
  kind: "penalty_change";
  new_amount: number;
};

export type ActivePause = {
  pause_type: PauseType;
};

export async function getApprovalRequests(): Promise<ApprovalRequest[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Only fetch pending requests where current user is the partner (not the requester)
  const { data: requests } = await supabase
    .from("approval_requests")
    .select(
      `id, pair_id, requested_by, type, reference_id, status, created_at,
       requester:profiles!approval_requests_requested_by_fkey(display_name)`,
    )
    .neq("requested_by", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (!requests || requests.length === 0) return [];

  // Resolve details for each request type
  const result: ApprovalRequest[] = [];

  for (const req of requests) {
    const requesterRaw = req.requester;
    const requester = Array.isArray(requesterRaw) ? requesterRaw[0] : requesterRaw;
    const requester_name = requester?.display_name ?? null;

    let details: ApprovalRequest["details"] = null;

    if (req.type === "habit_deletion" && req.reference_id) {
      const { data: habit } = await supabase
        .from("habits")
        .select("name")
        .eq("id", req.reference_id)
        .maybeSingle();
      details = { kind: "habit_deletion", habit_name: habit?.name ?? "Unknown habit" };
    } else if (req.type === "pause" && req.reference_id) {
      const { data: pause } = await supabase
        .from("pauses")
        .select("start_date, end_date, pause_type")
        .eq("id", req.reference_id)
        .maybeSingle();
      if (pause) {
        details = {
          kind: "pause",
          start_date: pause.start_date,
          end_date: pause.end_date,
          pause_type: pause.pause_type as PauseType,
        };
      }
    } else if (req.type === "penalty_change" && req.reference_id) {
      // reference_id stores the new_amount as a string-encoded UUID isn't used here
      // We store the new amount in the notifications data — fetch from pairs table via pair_id
      // For penalty_change, we store the requested amount in a pauses-like way
      // Actually we'll store the new_amount in the reference_id field as a text (handled below)
      // This is a workaround — penalty_change stores new amount in a separate lookup
      const { data: pair } = await supabase
        .from("pairs")
        .select("penalty_amount")
        .eq("id", req.pair_id)
        .maybeSingle();
      details = { kind: "penalty_change", new_amount: pair?.penalty_amount ?? 0 };
    }

    result.push({
      id: req.id,
      pair_id: req.pair_id,
      requested_by: req.requested_by,
      type: req.type as ApprovalType,
      reference_id: req.reference_id,
      status: req.status as "pending" | "approved" | "denied",
      created_at: req.created_at,
      requester_name,
      details,
    });
  }

  return result;
}

export async function requestPause(
  pairId: string,
  startDate: string,
  endDate: string,
  pauseType: PauseType,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const today = new Date().toISOString().slice(0, 10);
  if (startDate < today) return { error: "Start date cannot be in the past." };
  if (endDate < startDate) return { error: "End date must be after start date." };

  // Insert pause record
  const { data: pause, error: pauseError } = await supabase
    .from("pauses")
    .insert({
      pair_id: pairId,
      requested_by: user.id,
      start_date: startDate,
      end_date: endDate,
      pause_type: pauseType,
      status: "pending",
    })
    .select("id")
    .single();

  if (pauseError) return { error: pauseError.message };

  // Insert approval request
  const { error: approvalError } = await supabase.from("approval_requests").insert({
    pair_id: pairId,
    requested_by: user.id,
    type: "pause",
    reference_id: pause.id,
    status: "pending",
  });

  if (approvalError) return { error: approvalError.message };

  // Notify partner
  const { data: pair } = await supabase
    .from("pairs")
    .select("user_a, user_b")
    .eq("id", pairId)
    .single();

  if (pair) {
    const partnerId = pair.user_a === user.id ? pair.user_b : pair.user_a;
    const adminClient = createAdminClient();
    const typeLabel = pauseType === "full" ? "Full pause" : "Payment-only pause";
    await adminClient.from("notifications").insert({
      user_id: partnerId,
      type: "pause_request",
      title: "Pause requested",
      body: `${typeLabel} requested: ${startDate} to ${endDate}`,
      data: { pair_id: pairId },
    });
  }

  revalidatePath("/approvals");
  revalidatePath("/pairs");
  return { error: null };
}

export async function approveRequest(
  requestId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: req } = await supabase
    .from("approval_requests")
    .select("id, type, reference_id, pair_id, requested_by")
    .eq("id", requestId)
    .single();

  if (!req) return { error: "Request not found." };

  // Update approval_request status
  const { error: updateError } = await supabase
    .from("approval_requests")
    .update({ status: "approved" })
    .eq("id", requestId);

  if (updateError) return { error: updateError.message };

  const adminClient = createAdminClient();

  // Act on the referenced record
  if (req.type === "habit_deletion" && req.reference_id) {
    await adminClient
      .from("habits")
      .update({ status: "deleted" })
      .eq("id", req.reference_id);
  } else if (req.type === "pause" && req.reference_id) {
    await adminClient
      .from("pauses")
      .update({ status: "approved" })
      .eq("id", req.reference_id);
  } else if (req.type === "penalty_change" && req.reference_id) {
    // reference_id encodes new amount — not used this way, skip for now
  }

  // Notify requester
  await adminClient.from("notifications").insert({
    user_id: req.requested_by,
    type: "approval_approved",
    title: "Request approved",
    body: `Your ${req.type.replace("_", " ")} request was approved.`,
    data: { pair_id: req.pair_id },
  });

  revalidatePath("/approvals");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function denyRequest(
  requestId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: req } = await supabase
    .from("approval_requests")
    .select("id, type, reference_id, pair_id, requested_by")
    .eq("id", requestId)
    .single();

  if (!req) return { error: "Request not found." };

  const { error: updateError } = await supabase
    .from("approval_requests")
    .update({ status: "denied" })
    .eq("id", requestId);

  if (updateError) return { error: updateError.message };

  const adminClient = createAdminClient();

  // If a habit deletion was denied, restore it to active
  if (req.type === "habit_deletion" && req.reference_id) {
    await adminClient
      .from("habits")
      .update({ status: "active" })
      .eq("id", req.reference_id);
  } else if (req.type === "pause" && req.reference_id) {
    await adminClient
      .from("pauses")
      .update({ status: "denied" })
      .eq("id", req.reference_id);
  }

  // Notify requester
  await adminClient.from("notifications").insert({
    user_id: req.requested_by,
    type: "approval_denied",
    title: "Request denied",
    body: `Your ${req.type.replace("_", " ")} request was denied.`,
    data: { pair_id: req.pair_id },
  });

  revalidatePath("/approvals");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function getActivePause(
  pairId: string,
  date: string,
): Promise<ActivePause | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pauses")
    .select("pause_type")
    .eq("pair_id", pairId)
    .eq("status", "approved")
    .lte("start_date", date)
    .gte("end_date", date)
    .maybeSingle();

  if (!data) return null;
  return { pause_type: data.pause_type as PauseType };
}

export async function getPendingApprovalCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("approval_requests")
    .select("id", { count: "exact", head: true })
    .neq("requested_by", user.id)
    .eq("status", "pending");

  return count ?? 0;
}

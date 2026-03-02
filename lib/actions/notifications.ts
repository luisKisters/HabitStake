"use server";

import { createClient } from "@/lib/supabase/server";

export async function savePushSubscription(subscription: object) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ push_subscription: subscription })
    .eq("id", user.id);
}

export async function getNotifications() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return [];
  return data;
}

export async function markNotificationsRead(ids: string[]) {
  if (ids.length === 0) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read: true }).in("id", ids);
}

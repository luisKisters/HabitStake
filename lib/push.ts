import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let vapidInitialized = false;

function initVapid() {
  if (vapidInitialized) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;
  webpush.setVapidDetails("mailto:support@habitstake.app", publicKey, privateKey);
  vapidInitialized = true;
}

export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  initVapid();
  if (!vapidInitialized) return;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("push_subscription")
    .eq("id", userId)
    .single();

  if (!profile?.push_subscription) return;

  try {
    await webpush.sendNotification(
      profile.push_subscription as webpush.PushSubscription,
      JSON.stringify(payload)
    );
  } catch (err: unknown) {
    // Expired or invalid subscription — clear it
    if (
      err &&
      typeof err === "object" &&
      "statusCode" in err &&
      ((err as { statusCode: number }).statusCode === 410 ||
        (err as { statusCode: number }).statusCode === 404)
    ) {
      await admin
        .from("profiles")
        .update({ push_subscription: null })
        .eq("id", userId);
    }
  }
}

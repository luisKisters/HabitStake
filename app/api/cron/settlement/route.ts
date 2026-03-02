import { createAdminClient } from "@/lib/supabase/admin";
import { calculateWeekPenalties } from "@/lib/penalties";
import { sendPushNotification } from "@/lib/push";

function getMondayOfWeek(date: Date): Date {
  const day = date.getDay(); // 0=Sun
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getSundayOfWeek(date: Date): Date {
  const monday = getMondayOfWeek(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const weekStart = getMondayOfWeek(now).toISOString().slice(0, 10);
  const weekEnd = getSundayOfWeek(now).toISOString().slice(0, 10);

  // Get all active pairs
  const { data: pairs, error: pairsError } = await admin
    .from("pairs")
    .select("id, user_a, user_b, penalty_amount")
    .eq("status", "active");

  if (pairsError || !pairs) {
    return Response.json({ error: pairsError?.message ?? "Failed to fetch pairs" }, { status: 500 });
  }

  let processed = 0;

  for (const pair of pairs) {
    // Skip if settlement already exists for this week
    const { data: existing } = await admin
      .from("settlements")
      .select("id")
      .eq("pair_id", pair.id)
      .eq("week_start", weekStart)
      .maybeSingle();

    if (existing) continue;

    const [aResult, bResult] = await Promise.all([
      calculateWeekPenalties(pair.user_a, pair.id, weekStart, weekEnd, admin),
      calculateWeekPenalties(pair.user_b, pair.id, weekStart, weekEnd, admin),
    ]);

    const diff = aResult.totalPenalty - bResult.totalPenalty;
    const net_amount = Math.abs(diff);
    const net_owed_by = diff > 0 ? pair.user_a : diff < 0 ? pair.user_b : null;

    const { data: settlement, error: insertError } = await admin
      .from("settlements")
      .insert({
        pair_id: pair.id,
        week_start: weekStart,
        week_end: weekEnd,
        user_a_penalties: aResult.totalPenalty,
        user_b_penalties: bResult.totalPenalty,
        net_owed_by,
        net_amount,
      })
      .select("id")
      .single();

    if (insertError || !settlement) continue;

    // Get partner display names for notification bodies
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name")
      .in("id", [pair.user_a, pair.user_b]);

    const profileMap = new Map((profiles ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name]));

    const notifications = [pair.user_a, pair.user_b].map((userId) => {
      const isUserA = userId === pair.user_a;
      const myPenalty = isUserA ? aResult.totalPenalty : bResult.totalPenalty;
      const partnerPenalty = isUserA ? bResult.totalPenalty : aResult.totalPenalty;
      const partnerName = profileMap.get(isUserA ? pair.user_b : pair.user_a) ?? "Partner";

      let body: string;
      if (net_amount === 0) {
        body = "All even this week — great job!";
      } else if (net_owed_by === userId) {
        body = `You owe ${partnerName} $${net_amount.toFixed(2)} this week.`;
      } else {
        body = `${partnerName} owes you $${net_amount.toFixed(2)} this week.`;
      }

      return {
        user_id: userId,
        type: "settlement",
        title: "Weekly Settlement",
        body,
        data: { settlement_id: settlement.id },
      };
    });

    await admin.from("notifications").insert(notifications);

    // Send push notifications to both users
    await Promise.all(
      notifications.map((n) =>
        sendPushNotification(n.user_id, {
          title: n.title,
          body: n.body,
          url: `/settlements/${settlement.id}`,
        })
      )
    );

    processed++;
  }

  return Response.json({ processed });
}

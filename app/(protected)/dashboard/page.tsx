import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getDailyData } from "@/lib/actions/habits";
import { DailyView } from "@/components/habits/daily-view";
import { RunningBalance } from "@/components/settlements/running-balance";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  if (!profile?.display_name) {
    redirect("/onboarding");
  }

  const today = new Date().toISOString().slice(0, 10);
  const initialData = await getDailyData(today);

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">Today</h1>
      {initialData.pair && <RunningBalance pairId={initialData.pair.id} />}
      <DailyView initialData={initialData} userId={user.id} />
    </div>
  );
}

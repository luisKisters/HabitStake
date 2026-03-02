import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getDailyData } from "@/lib/actions/habits";
import { getTodayProgress, getLongestCurrentStreak } from "@/lib/actions/stats";
import { DailyView } from "@/components/habits/daily-view";
import { RunningBalance } from "@/components/settlements/running-balance";
import { ProgressRing } from "@/components/dashboard/progress-ring";
import { StreakBadge } from "@/components/dashboard/streak-badge";
import { Confetti } from "@/components/dashboard/confetti";
import { PageTransition } from "@/components/page-transition";

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
  const [initialData, todayProgress, longestStreak] = await Promise.all([
    getDailyData(today),
    getTodayProgress(),
    getLongestCurrentStreak(),
  ]);

  const isPerfectDay =
    todayProgress.due > 0 && todayProgress.completed === todayProgress.due;

  return (
    <PageTransition>
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Today</h1>
      {todayProgress.due > 0 && (
        <div className="flex items-center gap-3">
          <ProgressRing
            completed={todayProgress.completed}
            due={todayProgress.due}
          />
          {longestStreak > 0 && <StreakBadge streak={longestStreak} />}
        </div>
      )}
      {isPerfectDay && <Confetti />}
      {initialData.pair && <RunningBalance pairId={initialData.pair.id} />}
      <DailyView initialData={initialData} userId={user.id} />
    </div>
    </PageTransition>
  );
}

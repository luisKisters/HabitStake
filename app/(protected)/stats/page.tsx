import { getHabitStats, getAllTimeStats } from "@/lib/actions/stats";
import { AllTimeSummary } from "@/components/stats/all-time-summary";
import { StatsTabs } from "@/components/stats/stats-tabs";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const [habitStats, allTimeStats] = await Promise.all([
    getHabitStats(),
    getAllTimeStats(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Stats</h1>
      <AllTimeSummary stats={allTimeStats} />
      <StatsTabs habitStats={habitStats} />
    </div>
  );
}

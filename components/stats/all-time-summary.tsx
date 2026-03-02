import { Card, CardContent } from "@/components/ui/card";
import type { AllTimeStats } from "@/lib/actions/stats";

export function AllTimeSummary({ stats }: { stats: AllTimeStats }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Card>
        <CardContent className="py-4 px-4 flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Lost
          </p>
          <p className="text-lg font-bold text-destructive">
            ${stats.totalMoneyLost.toFixed(2)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-4 px-4 flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Earned
          </p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            ${stats.totalMoneyEarned.toFixed(2)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-4 px-4 flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Rate
          </p>
          <p className="text-lg font-bold">{stats.overallCompletionRate}%</p>
        </CardContent>
      </Card>
    </div>
  );
}

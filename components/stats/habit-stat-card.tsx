import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HabitStat } from "@/lib/actions/stats";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  stat: HabitStat;
  focusStreak?: boolean;
};

export function HabitStatCard({ stat, focusStreak = false }: Props) {
  return (
    <Card>
      <CardContent className="py-4 px-4 flex flex-col gap-2">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm truncate">{stat.name}</span>
          <Badge variant="outline" className="shrink-0">
            {stat.completionRate}% done
          </Badge>
        </div>

        {/* Streak row */}
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {stat.streak.current}
          </span>{" "}
          day streak &middot; Best:{" "}
          <span className="font-medium text-foreground">
            {stat.streak.longest}
          </span>{" "}
          days
        </p>

        {/* Best/worst day row */}
        {!focusStreak && (stat.bestDay !== null || stat.worstDay !== null) && (
          <p className="text-xs text-muted-foreground">
            {stat.bestDay !== null && (
              <>
                Best day:{" "}
                <span className="font-medium text-foreground">
                  {DAY_NAMES[stat.bestDay]}
                </span>
              </>
            )}
            {stat.bestDay !== null && stat.worstDay !== null && " · "}
            {stat.worstDay !== null && stat.worstDay !== stat.bestDay && (
              <>
                Worst:{" "}
                <span className="font-medium text-foreground">
                  {DAY_NAMES[stat.worstDay]}
                </span>
              </>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

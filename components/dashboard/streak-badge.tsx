import { Badge } from "@/components/ui/badge";

export function StreakBadge({ streak }: { streak: number }) {
  return (
    <Badge variant="secondary" className="text-sm px-3 py-1.5 gap-1.5">
      🔥 <span className="font-bold">{streak}</span>{" "}
      <span className="text-xs">day streak</span>
    </Badge>
  );
}

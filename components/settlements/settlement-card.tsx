import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Settlement } from "@/lib/actions/settlements";

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function SettlementCard({ settlement }: { settlement: Settlement }) {
  const { id, week_start, week_end, net_amount, i_owe, partner_name } = settlement;
  const partner = partner_name ?? "Partner";

  let label: string;
  let badgeVariant: "destructive" | "secondary" | "outline";

  if (net_amount === 0) {
    label = "All even";
    badgeVariant = "outline";
  } else if (i_owe) {
    label = `You owe ${partner} $${net_amount.toFixed(2)}`;
    badgeVariant = "destructive";
  } else {
    label = `${partner} owes you $${net_amount.toFixed(2)}`;
    badgeVariant = "secondary";
  }

  return (
    <Link href={`/settlements/${id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-medium">{formatDateRange(week_start, week_end)}</p>
            <p className="text-muted-foreground text-xs mt-0.5">{label}</p>
          </div>
          <Badge variant={badgeVariant}>
            {net_amount === 0 ? "Even" : i_owe ? "You owe" : "Owed to you"}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}

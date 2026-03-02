import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, CheckCircle2, XCircle, Minus } from "lucide-react";
import type { Settlement, DayBreakdown } from "@/lib/actions/settlements";

const DAY_LABELS: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${DAY_LABELS[d.getDay()]} ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

type Props = {
  settlement: Settlement;
  breakdown: DayBreakdown[];
};

export function SettlementDetail({ settlement, breakdown }: Props) {
  const { week_start, week_end, net_amount, i_owe, partner_name } = settlement;
  const partner = partner_name ?? "Partner";

  const fmt = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  let headline: string;
  if (net_amount === 0) {
    headline = "All even this week!";
  } else if (i_owe) {
    headline = `You owe ${partner} $${net_amount.toFixed(2)}`;
  } else {
    headline = `${partner} owes you $${net_amount.toFixed(2)}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settlements">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <div>
        <p className="text-muted-foreground text-xs">
          {fmt(week_start)} – {fmt(week_end)}
        </p>
        <h1 className="text-2xl font-bold mt-1">{headline}</h1>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-3 bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Date</span>
          <span className="text-center">You</span>
          <span className="text-center">{partner}</span>
        </div>
        {breakdown.map((day) => (
          <div
            key={day.date}
            className="grid grid-cols-3 border-t px-4 py-3 text-sm items-center"
          >
            <span className="font-medium">{formatDate(day.date)}</span>
            <span className="flex justify-center">
              {day.my_missed ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </span>
            <span className="flex justify-center">
              {day.partner_missed ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Your penalties</span>
          <span>${settlement.user_a_penalties.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{partner}&apos;s penalties</span>
          <span>${settlement.user_b_penalties.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold border-t pt-2">
          <span>Net</span>
          <Badge variant={net_amount === 0 ? "outline" : i_owe ? "destructive" : "secondary"}>
            {net_amount === 0 ? "Even" : `$${net_amount.toFixed(2)}`}
          </Badge>
        </div>
      </div>
    </div>
  );
}

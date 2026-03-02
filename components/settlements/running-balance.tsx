import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { getRunningBalance } from "@/lib/actions/settlements";

export async function RunningBalance({ pairId }: { pairId: string }) {
  const balance = await getRunningBalance(pairId);

  if (!balance) return null;

  const { net_amount, i_owe } = balance;

  let label: string;
  let colorClass: string;

  if (net_amount === 0) {
    label = "All even this week";
    colorClass = "text-muted-foreground";
  } else if (i_owe) {
    label = `You owe $${net_amount.toFixed(2)} this week`;
    colorClass = "text-destructive";
  } else {
    label = `Partner owes you $${net_amount.toFixed(2)} this week`;
    colorClass = "text-green-600 dark:text-green-400";
  }

  return (
    <Link href="/settlements">
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="py-3 px-4 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Running balance
          </p>
          <p className={`text-sm font-semibold ${colorClass}`}>{label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

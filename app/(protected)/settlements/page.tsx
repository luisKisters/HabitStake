import { getSettlements } from "@/lib/actions/settlements";
import { getActivePair } from "@/lib/actions/habits";
import { SettlementCard } from "@/components/settlements/settlement-card";
import { PageTransition } from "@/components/page-transition";

export const dynamic = "force-dynamic";

export default async function SettlementsPage() {
  const pair = await getActivePair();
  const settlements = await getSettlements(pair?.id);

  return (
    <PageTransition>
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settlements</h1>

      {settlements.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground text-sm">No settlements yet.</p>
          <p className="text-muted-foreground text-xs mt-1">
            Settlements are calculated every Sunday at 8 PM.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {settlements.map((s) => (
            <SettlementCard key={s.id} settlement={s} />
          ))}
        </div>
      )}
    </div>
    </PageTransition>
  );
}

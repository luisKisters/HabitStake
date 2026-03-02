import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPairs } from "@/lib/actions/pairs";
import { PairsList } from "@/components/pairs/pairs-list";
import { UserSearch } from "@/components/pairs/user-search";
import { PageTransition } from "@/components/page-transition";

export const dynamic = "force-dynamic";

export default async function PairsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const pairs = await getPairs();

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Pairs</h1>
          <UserSearch />
        </div>

        <PairsList initialPairs={pairs} userId={user.id} />
      </div>
    </PageTransition>
  );
}

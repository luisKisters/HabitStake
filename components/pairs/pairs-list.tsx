"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { PairCard } from "./pair-card";
import type { Pair } from "@/lib/actions/pairs";

type PairGroups = {
  active: Pair[];
  incoming: Pair[];
  outgoing: Pair[];
};

export function PairsList({
  initialPairs,
  userId,
}: {
  initialPairs: PairGroups;
  userId: string;
}) {
  const router = useRouter();
  const [pairs, setPairs] = useState<PairGroups>(initialPairs);

  // Keep pairs in sync when server re-renders after revalidatePath
  useEffect(() => {
    setPairs(initialPairs);
  }, [initialPairs]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("my-pairs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pairs",
          filter: `user_a=eq.${userId}`,
        },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pairs",
          filter: `user_b=eq.${userId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  const { active, incoming, outgoing } = pairs;
  const isEmpty = active.length + incoming.length + outgoing.length === 0;

  if (isEmpty) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No pairs yet. Use &ldquo;Find Partner&rdquo; to send a request.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {incoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase opacity-60">
            Incoming Requests
          </h2>
          <AnimatePresence initial={false}>
            {incoming.map((pair) => (
              <motion.div key={pair.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                <PairCard pair={pair} />
              </motion.div>
            ))}
          </AnimatePresence>
        </section>
      )}

      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase opacity-60">
            Active Pairs
          </h2>
          <AnimatePresence initial={false}>
            {active.map((pair) => (
              <motion.div key={pair.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                <PairCard pair={pair} />
              </motion.div>
            ))}
          </AnimatePresence>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase opacity-60">
            Sent Requests
          </h2>
          <AnimatePresence initial={false}>
            {outgoing.map((pair) => (
              <motion.div key={pair.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                <PairCard pair={pair} />
              </motion.div>
            ))}
          </AnimatePresence>
        </section>
      )}
    </div>
  );
}

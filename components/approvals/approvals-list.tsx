"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { getApprovalRequests, type ApprovalRequest } from "@/lib/actions/approvals";
import { ApprovalItem } from "./approval-item";

type Props = {
  initialRequests: ApprovalRequest[];
};

export function ApprovalsList({ initialRequests }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Realtime subscription on approval_requests
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("approvals-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "approval_requests" },
        () => {
          startTransition(() => {
            router.refresh();
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  if (initialRequests.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground text-sm">No pending approvals.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {initialRequests.map((req) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
          >
            <ApprovalItem req={req} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

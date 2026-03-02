"use client";

import { useEffect } from "react";
import { getQueue, clearQueue } from "@/lib/offline-queue";
import { toggleHabitLog } from "@/lib/actions/habits";

export function OfflineSyncProvider() {
  useEffect(() => {
    async function flush() {
      if (!navigator.onLine) return;
      const queue = getQueue();
      if (queue.length === 0) return;
      clearQueue();
      await Promise.all(
        queue.map((item) => toggleHabitLog(item.habitId, item.date, item.completed))
      );
    }

    // Flush on mount (handles page reload after offline period)
    flush();

    // Flush whenever we come back online
    window.addEventListener("online", flush);

    // Also listen for SW-initiated sync signal
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "SYNC_HABITS") flush();
    }
    navigator.serviceWorker?.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("online", flush);
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, []);

  return null;
}

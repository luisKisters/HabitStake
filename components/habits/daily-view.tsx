"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { getDailyData, type HabitWithLog, type ActivePair, type PauseStatus } from "@/lib/actions/habits";
import { Button } from "@/components/ui/button";
import { HabitItem } from "./habit-item";
import { HabitFormDialog } from "./habit-form-dialog";

type DailyData = {
  myHabits: HabitWithLog[];
  partnerHabits: HabitWithLog[];
  pair: ActivePair | null;
  pauseStatus: PauseStatus;
};

// Returns the Mon–Sun dates of the week containing `date`
function getWeekDates(date: Date): Date[] {
  const day = date.getDay(); // 0=Sun
  // Monday = day - 1 (or +6 if Sunday)
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type Props = {
  initialData: DailyData;
  userId: string;
};

export function DailyView({ initialData, userId }: Props) {
  const [isPending, startTransition] = useTransition();
  const today = toISO(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [data, setData] = useState<DailyData>(initialData);
  const [addOpen, setAddOpen] = useState(false);

  const weekDates = getWeekDates(new Date());

  // Refresh data when selectedDate changes (not on initial mount)
  function selectDate(date: string) {
    if (date === selectedDate) return;
    setSelectedDate(date);
    startTransition(async () => {
      const fresh = await getDailyData(date);
      setData(fresh);
    });
  }

  // Keep in sync with server re-renders (after revalidatePath) — today only
  useEffect(() => {
    if (selectedDate === today) {
      setData(initialData);
    }
  }, [initialData, selectedDate, today]);

  // Realtime subscription for habit_logs changes
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("habit-logs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habit_logs" },
        () => {
          startTransition(async () => {
            const fresh = await getDailyData(selectedDate);
            setData(fresh);
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  if (!data.pair) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground mb-4 text-sm">
          You need an active pair to start tracking habits.
        </p>
        <Button asChild variant="outline">
          <Link href="/pairs">Go to Pairs</Link>
        </Button>
      </div>
    );
  }

  const { myHabits, partnerHabits, pauseStatus } = data;
  const isPaused = pauseStatus !== "none";

  return (
    <div className="space-y-6">
      {/* Week date strip */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weekDates.map((d, i) => {
          const iso = toISO(d);
          const isToday = iso === today;
          const isFuture = iso > today;
          const isSelected = iso === selectedDate;

          return (
            <button
              key={iso}
              disabled={isFuture}
              onClick={() => selectDate(iso)}
              className={[
                "flex min-w-[2.75rem] flex-col items-center rounded-xl px-2 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-30",
                isSelected
                  ? "bg-primary text-primary-foreground font-semibold"
                  : isToday
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted",
              ].join(" ")}
            >
              <span className="uppercase tracking-wide">{DAY_NAMES[i]}</span>
              <span className="mt-0.5 text-base font-bold">{d.getDate()}</span>
            </button>
          );
        })}
      </div>

      {/* Pause banner */}
      {isPaused && (
        <div
          className={[
            "rounded-xl border px-4 py-3 text-sm",
            pauseStatus === "full"
              ? "bg-muted/60 border-muted text-muted-foreground"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
          ].join(" ")}
        >
          {pauseStatus === "full"
            ? "⏸ Tracking paused — no penalties for this day."
            : "⚠ Payment pause — habits tracked but no penalties for this day."}
        </div>
      )}

      {/* My Habits */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide uppercase opacity-60">
            My Habits
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAddOpen(true)}
            className="gap-1 text-xs"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {myHabits.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            {selectedDate === today
              ? "No habits for today. Add one!"
              : "No habits scheduled for this day."}
          </p>
        ) : (
          <div className={["space-y-2", isPending ? "opacity-60" : ""].join(" ")}>
            <AnimatePresence initial={false}>
              {myHabits.map((habit) => (
                <motion.div
                  key={habit.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <HabitItem
                    habit={habit}
                    date={selectedDate}
                    isOwner={true}
                    pauseStatus={pauseStatus}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Partner's Habits */}
      {partnerHabits.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase opacity-60">
            Partner&rsquo;s Habits
          </h2>
          <div className={["space-y-2", isPending ? "opacity-60" : ""].join(" ")}>
            <AnimatePresence initial={false}>
              {partnerHabits.map((habit) => (
                <motion.div
                  key={habit.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <HabitItem
                    habit={habit}
                    date={selectedDate}
                    isOwner={false}
                    pauseStatus={pauseStatus}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      <HabitFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

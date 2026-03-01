"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createHabit, updateHabit, type HabitWithLog } from "@/lib/actions/habits";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit?: HabitWithLog; // if provided, editing
};

export function HabitFormDialog({ open, onOpenChange, habit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(habit?.name ?? "");
  const [activeDays, setActiveDays] = useState<number[]>(
    habit?.active_days ?? [],
  );
  const [reminderTime, setReminderTime] = useState(
    habit?.reminder_time ?? "",
  );
  const [startDate, setStartDate] = useState(habit?.start_date ?? today());
  const [error, setError] = useState<string | null>(null);

  // Sync form state when habit prop changes (e.g., switching between edit targets)
  function resetForm() {
    setName(habit?.name ?? "");
    setActiveDays(habit?.active_days ?? []);
    setReminderTime(habit?.reminder_time ?? "");
    setStartDate(habit?.start_date ?? today());
    setError(null);
  }

  function toggleDay(day: number) {
    setActiveDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = habit
        ? await updateHabit(habit.id, {
            name,
            active_days: activeDays,
            reminder_time: reminderTime || null,
            start_date: startDate,
          })
        : await createHabit({
            name,
            active_days: activeDays,
            reminder_time: reminderTime || null,
            start_date: startDate,
          });

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
      onOpenChange(false);
      if (!habit) resetForm();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{habit ? "Edit Habit" : "Add Habit"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="habit-name">Name</Label>
            <Input
              id="habit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning run"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Active days</Label>
            <div className="flex gap-1">
              {DAYS.map((label, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={DAY_LABELS[idx]}
                  onClick={() => toggleDay(idx)}
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors",
                    activeDays.includes(idx)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="reminder-time">Reminder time (optional)</Label>
            <input
              id="reminder-time"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="border-input bg-background text-foreground placeholder:text-muted-foreground flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-1 focus-visible:outline-none"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="start-date">Start date</Label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border-input bg-background text-foreground placeholder:text-muted-foreground flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-1 focus-visible:outline-none"
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "Saving…" : habit ? "Save changes" : "Add habit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

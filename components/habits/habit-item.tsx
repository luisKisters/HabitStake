"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Pencil, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleHabitLog, requestDeleteHabit, type HabitWithLog, type PauseStatus } from "@/lib/actions/habits";
import { enqueue } from "@/lib/offline-queue";
import { HabitFormDialog } from "./habit-form-dialog";

type Props = {
  habit: HabitWithLog;
  date: string;
  isOwner: boolean;
  pauseStatus?: PauseStatus;
};

export function HabitItem({ habit, date, isOwner, pauseStatus = "none" }: Props) {
  const [isPending, startTransition] = useTransition();
  const [optimisticCompleted, setOptimisticCompleted] = useState(
    habit.log?.completed ?? false,
  );
  const [editOpen, setEditOpen] = useState(false);
  const [flash, setFlash] = useState(false);

  // Keep in sync when parent re-renders with new data
  const completed = isPending ? optimisticCompleted : (habit.log?.completed ?? false);

  function handleToggle() {
    if (!isOwner || isPending) return;
    const next = !completed;
    setOptimisticCompleted(next);
    if (next) {
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    }
    // Queue locally when offline; OfflineSyncProvider will flush on reconnect
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueue({ habitId: habit.id, date, completed: next });
      return;
    }
    startTransition(async () => {
      await toggleHabitLog(habit.id, date, next);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await requestDeleteHabit(habit.id);
    });
  }

  const isPendingDeletion = habit.status === "pending_deletion";
  const isFullPause = pauseStatus === "full";
  const isPaymentPause = pauseStatus === "payment_only";
  // Full pause disables interaction; payment pause still allows check-off
  const canInteract = isOwner && !isFullPause;

  return (
    <>
      <motion.div
        whileTap={canInteract ? { scale: 0.97 } : undefined}
        className={[
          "relative flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
          isFullPause
            ? "bg-muted/40 border-muted opacity-60"
            : completed
              ? "bg-primary/5 border-primary/20"
              : "bg-card",
          isPendingDeletion ? "opacity-50" : "",
          canInteract ? "cursor-pointer" : "cursor-default",
        ].join(" ")}
        onClick={canInteract ? handleToggle : undefined}
      >
        {/* Animated green flash overlay */}
        <AnimatePresence>
          {flash && (
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-xl bg-green-500/20"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </AnimatePresence>

        {/* Checkbox — hidden when full pause */}
        {!isFullPause && (
          <motion.div
            animate={completed ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={{ duration: 0.2 }}
            className={[
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              completed
                ? "border-primary bg-primary"
                : "border-muted-foreground/40",
            ].join(" ")}
          >
            {completed && (
              <svg
                className="h-3 w-3 text-primary-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </motion.div>
        )}

        {/* Paused icon */}
        {isFullPause && (
          <span className="text-muted-foreground shrink-0 text-base">⏸</span>
        )}

        <span
          className={[
            "flex-1 text-sm font-medium",
            completed && !isFullPause ? "text-muted-foreground line-through" : "",
          ].join(" ")}
        >
          {habit.name}
          {isPendingDeletion && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (pending deletion)
            </span>
          )}
          {isFullPause && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              Paused
            </span>
          )}
          {isPaymentPause && (
            <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">
              No penalty
            </span>
          )}
        </span>

        {/* Owner actions */}
        {isOwner && !isPendingDeletion && !isFullPause && (
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onSelect={() => setEditOpen(true)}
                className="gap-2"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={handleDelete}
                className="text-destructive gap-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </motion.div>

      <HabitFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        habit={habit}
      />
    </>
  );
}

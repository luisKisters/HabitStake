"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HabitStatCard } from "./habit-stat-card";
import type { HabitStat } from "@/lib/actions/stats";

export function StatsTabs({ habitStats }: { habitStats: HabitStat[] }) {
  if (habitStats.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No habits tracked yet. Add habits on the dashboard to see stats here.
      </p>
    );
  }

  const byStreak = [...habitStats].sort(
    (a, b) => b.streak.current - a.streak.current,
  );

  return (
    <Tabs defaultValue="per-habit">
      <TabsList className="mb-4">
        <TabsTrigger value="per-habit">Per Habit</TabsTrigger>
        <TabsTrigger value="streaks">Streaks</TabsTrigger>
      </TabsList>

      <TabsContent value="per-habit" className="space-y-3">
        {habitStats.map((stat) => (
          <HabitStatCard key={stat.id} stat={stat} />
        ))}
      </TabsContent>

      <TabsContent value="streaks" className="space-y-3">
        {byStreak.map((stat) => (
          <HabitStatCard key={stat.id} stat={stat} focusStreak />
        ))}
      </TabsContent>
    </Tabs>
  );
}

const QUEUE_KEY = "habitstake_offline_queue";

export type OfflineHabitToggle = {
  habitId: string;
  date: string;
  completed: boolean;
};

export function getQueue(): OfflineHabitToggle[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function enqueue(item: OfflineHabitToggle) {
  const queue = getQueue();
  // Replace any existing entry for the same habit+date (last write wins)
  const filtered = queue.filter(
    (q) => !(q.habitId === item.habitId && q.date === item.date)
  );
  localStorage.setItem(QUEUE_KEY, JSON.stringify([...filtered, item]));
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

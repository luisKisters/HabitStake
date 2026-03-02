"use client";

import { useEffect, useTransition } from "react";
import { Bell } from "lucide-react";
import { markNotificationsRead } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  data: Record<string, unknown> | null;
  created_at: string;
};

type Props = {
  initialNotifications: Notification[];
};

export function NotificationsList({ initialNotifications }: Props) {
  const [, startTransition] = useTransition();

  // Mark all unread as read when the list mounts
  useEffect(() => {
    const unreadIds = initialNotifications
      .filter((n) => !n.read)
      .map((n) => n.id);
    if (unreadIds.length > 0) {
      startTransition(() => markNotificationsRead(unreadIds));
    }
  }, [initialNotifications]);

  if (initialNotifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Bell className="h-10 w-10 opacity-30" />
        <p className="text-sm">No notifications yet</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {initialNotifications.map((n) => (
        <li
          key={n.id}
          className={cn(
            "rounded-xl border px-4 py-3",
            !n.read ? "border-primary/30 bg-primary/5" : "bg-card"
          )}
        >
          <div className="flex items-start gap-3">
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{n.title}</p>
              {n.body && (
                <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

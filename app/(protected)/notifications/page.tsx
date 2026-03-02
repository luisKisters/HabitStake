import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/actions/notifications";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { PageTransition } from "@/components/page-transition";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const notifications = await getNotifications();

  return (
    <PageTransition>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <NotificationsList initialNotifications={notifications} />
      </div>
    </PageTransition>
  );
}

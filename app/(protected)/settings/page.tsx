import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { PageTransition } from "@/components/page-transition";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <PageTransition>
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Name</p>
          <p>{profile?.display_name ?? "Not set"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Email</p>
          <p>{user.email}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Theme</span>
        <ThemeSwitcher />
      </div>

      <SignOutButton />
    </div>
    </PageTransition>
  );
}

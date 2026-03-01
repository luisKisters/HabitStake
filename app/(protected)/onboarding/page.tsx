import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Already onboarded? Go to dashboard
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  if (profile?.display_name) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Welcome to HabitStake</h1>
          <p className="text-muted-foreground text-sm">
            Set your display name to get started
          </p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  );
}

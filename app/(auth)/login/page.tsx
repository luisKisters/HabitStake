import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">HabitStake</h1>
          <p className="text-muted-foreground text-sm">
            Sign in to start tracking your habits
          </p>
        </div>
        <OAuthButtons />
      </div>
    </div>
  );
}

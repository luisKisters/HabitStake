import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();

        // Auto-populate display_name and avatar_url from OAuth metadata
        if (!profile?.display_name) {
          const meta = user.user_metadata;
          const name = meta?.full_name || meta?.name || null;
          const avatar = meta?.avatar_url || meta?.picture || null;

          if (name) {
            await supabase
              .from("profiles")
              .update({
                display_name: name,
                ...(avatar ? { avatar_url: avatar } : {}),
              })
              .eq("id", user.id);
          } else {
            // No name from provider — fall back to manual entry
            return NextResponse.redirect(`${origin}/onboarding`);
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error — redirect to login
  return NextResponse.redirect(`${origin}/login`);
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getApprovalRequests } from "@/lib/actions/approvals";
import { ApprovalsList } from "@/components/approvals/approvals-list";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const requests = await getApprovalRequests();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Approvals</h1>
      <ApprovalsList initialRequests={requests} />
    </div>
  );
}

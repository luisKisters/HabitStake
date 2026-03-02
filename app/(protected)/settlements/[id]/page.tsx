import { notFound } from "next/navigation";
import { getSettlementById } from "@/lib/actions/settlements";
import { SettlementDetail } from "@/components/settlements/settlement-detail";

export const dynamic = "force-dynamic";

export default async function SettlementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getSettlementById(id);

  if (!result) notFound();

  return <SettlementDetail settlement={result.settlement} breakdown={result.breakdown} />;
}

"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { respondToPairRequest } from "@/lib/actions/pairs";
import type { Pair } from "@/lib/actions/pairs";
import { PenaltyConfig } from "./penalty-config";
import { PauseRequestDialog } from "./pause-request-dialog";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function PairCard({ pair }: { pair: Pair }) {
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRespond(accept: boolean) {
    setResponding(true);
    setError(null);
    const result = await respondToPairRequest(pair.id, accept);
    if (result.error) setError(result.error);
    setResponding(false);
  }

  const partner = pair.partner;
  const partnerName = partner.display_name ?? "Unknown";

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage src={partner.avatar_url ?? undefined} alt={partnerName} />
          <AvatarFallback>{getInitials(partnerName)}</AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate font-medium">{partnerName}</p>

          {pair.status === "active" && (
            <div className="flex flex-wrap items-center gap-2">
              <PenaltyConfig pairId={pair.id} initialAmount={pair.penalty_amount} />
              <PauseRequestDialog pairId={pair.id} />
            </div>
          )}

          {pair.status === "pending" && (
            <p className="text-muted-foreground text-sm">Pair request pending</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {pair.status === "active" && (
            <Badge variant="secondary">Active</Badge>
          )}

          {pair.status === "pending" && pair.user_b === partner.id && (
            // Outgoing request (current user is user_a, partner is user_b)
            <Badge variant="outline">Pending</Badge>
          )}

          {pair.status === "pending" && pair.user_a === partner.id && (
            // Incoming request (partner is user_a, current user is user_b)
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={responding}
                onClick={() => handleRespond(true)}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={responding}
                onClick={() => handleRespond(false)}
              >
                Decline
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      {error && (
        <p className="text-destructive px-4 pb-3 text-sm">{error}</p>
      )}
    </Card>
  );
}

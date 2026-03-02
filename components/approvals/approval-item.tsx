"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { approveRequest, denyRequest, type ApprovalRequest } from "@/lib/actions/approvals";

function formatDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function RequestDetails({ req }: { req: ApprovalRequest }) {
  if (!req.details) return null;

  if (req.details.kind === "habit_deletion") {
    return (
      <p className="text-muted-foreground text-sm">
        Delete habit: <span className="text-foreground font-medium">{req.details.habit_name}</span>
      </p>
    );
  }

  if (req.details.kind === "pause") {
    const label = req.details.pause_type === "full" ? "Full pause" : "Payment-only pause";
    return (
      <p className="text-muted-foreground text-sm">
        {label}:{" "}
        <span className="text-foreground font-medium">
          {formatDate(req.details.start_date)} – {formatDate(req.details.end_date)}
        </span>
      </p>
    );
  }

  if (req.details.kind === "penalty_change") {
    return (
      <p className="text-muted-foreground text-sm">
        Change penalty to{" "}
        <span className="text-foreground font-medium">${req.details.new_amount.toFixed(2)}</span>
      </p>
    );
  }

  return null;
}

function typeLabel(type: ApprovalRequest["type"]): string {
  switch (type) {
    case "habit_deletion":
      return "Habit deletion";
    case "pause":
      return "Pause request";
    case "penalty_change":
      return "Penalty change";
  }
}

export function ApprovalItem({ req }: { req: ApprovalRequest }) {
  const [isPending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState<"pending" | "approved" | "denied">("pending");

  function handleApprove() {
    startTransition(async () => {
      const result = await approveRequest(req.id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setLocalStatus("approved");
        toast.success("Request approved.");
      }
    });
  }

  function handleDeny() {
    startTransition(async () => {
      const result = await denyRequest(req.id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setLocalStatus("denied");
        toast.success("Request denied.");
      }
    });
  }

  if (localStatus !== "pending") {
    return (
      <Card className="opacity-60">
        <CardContent className="flex items-center gap-3 p-4">
          <Badge variant={localStatus === "approved" ? "default" : "secondary"}>
            {localStatus === "approved" ? "Approved" : "Denied"}
          </Badge>
          <span className="text-muted-foreground text-sm">
            {typeLabel(req.type)} from {req.requester_name ?? "partner"}
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {typeLabel(req.type)}
              </Badge>
              <span className="text-muted-foreground text-xs">
                from {req.requester_name ?? "partner"}
              </span>
            </div>
            <RequestDetails req={req} />
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              disabled={isPending}
              onClick={handleApprove}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={handleDeny}
            >
              Deny
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

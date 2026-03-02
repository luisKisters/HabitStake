"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPause, type PauseType } from "@/lib/actions/approvals";

type Props = {
  pairId: string;
};

export function PauseRequestDialog({ pairId }: Props) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pauseType, setPauseType] = useState<PauseType>("full");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await requestPause(pairId, startDate, endDate, pauseType);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setOpen(false);
      setStartDate("");
      setEndDate("");
      setPauseType("full");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs">
          Request Pause
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Request a Pause</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              min={today}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              min={startDate || today}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Pause Type</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPauseType("full")}
                className={[
                  "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
                  pauseType === "full"
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40",
                ].join(" ")}
              >
                Full pause
                <p className="mt-0.5 text-xs font-normal opacity-70">
                  No tracking or penalties
                </p>
              </button>
              <button
                type="button"
                onClick={() => setPauseType("payment_only")}
                className={[
                  "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
                  pauseType === "payment_only"
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40",
                ].join(" ")}
              >
                Payment only
                <p className="mt-0.5 text-xs font-normal opacity-70">
                  Track habits, no penalties
                </p>
              </button>
            </div>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Sending…" : "Send Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

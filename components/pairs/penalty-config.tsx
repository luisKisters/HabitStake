"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePenaltyAmount } from "@/lib/actions/pairs";

export function PenaltyConfig({
  pairId,
  initialAmount,
}: {
  pairId: string;
  initialAmount: number;
}) {
  const [amount, setAmount] = useState(initialAmount.toFixed(2));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid amount greater than $0");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updatePenaltyAmount(pairId, parsed);
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setEditing(false);
    }
  }

  if (!editing) {
    return (
      <button
        className="text-muted-foreground hover:text-foreground text-left text-sm transition-colors"
        onClick={() => setEditing(true)}
      >
        ${parseFloat(amount).toFixed(2)}/day penalty · tap to edit
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center">
        <span className="text-muted-foreground absolute left-2 text-sm">$</span>
        <Input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-7 w-24 pl-5 text-sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
        />
      </div>
      <Button size="sm" className="h-7 px-2 text-xs" disabled={saving} onClick={handleSave}>
        Save
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={() => {
          setEditing(false);
          setError(null);
        }}
      >
        Cancel
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

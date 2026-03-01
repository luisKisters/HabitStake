"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { searchUsers, sendPairRequest, type Profile } from "@/lib/actions/pairs";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, startSearch] = useTransition();
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      startSearch(async () => {
        const data = await searchUsers(query);
        setResults(data);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function handleSendRequest(userId: string) {
    setSending(userId);
    const result = await sendPairRequest(userId);
    setSending(null);
    if (result.error) {
      setErrors((prev) => ({ ...prev, [userId]: result.error! }));
    } else {
      setSent((prev) => new Set(prev).add(userId));
    }
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) {
      setQuery("");
      setResults([]);
      setSent(new Set());
      setErrors({});
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Find Partner</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Find a partner</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Search by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <div className="mt-2 space-y-2">
          {searching && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Searching…
            </p>
          )}

          {!searching && query.trim() && results.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No users found.
            </p>
          )}

          {results.map((profile) => {
            const name = profile.display_name ?? "Unknown";
            const hasSent = sent.has(profile.id);
            const isSending = sending === profile.id;
            const err = errors[profile.id];

            return (
              <div
                key={profile.id}
                className="flex items-center gap-3 rounded-lg p-2"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={profile.avatar_url ?? undefined} alt={name} />
                  <AvatarFallback>{getInitials(name)}</AvatarFallback>
                </Avatar>
                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                  {name}
                </p>
                <div className="shrink-0">
                  {hasSent ? (
                    <span className="text-muted-foreground text-xs">
                      Request sent
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      disabled={isSending}
                      onClick={() => handleSendRequest(profile.id)}
                    >
                      {isSending ? "Sending…" : "Send Request"}
                    </Button>
                  )}
                  {err && (
                    <p className="text-destructive mt-1 text-xs">{err}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

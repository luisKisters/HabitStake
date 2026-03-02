"use client";

import { useEffect } from "react";
import { savePushSubscription } from "@/lib/actions/notifications";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export function PushProvider() {
  useEffect(() => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    async function setup() {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // Reuse existing subscription if present
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          await savePushSubscription(existing.toJSON());
          return;
        }

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey!),
        });
        await savePushSubscription(subscription.toJSON());
      } catch {
        // Push setup failed silently (user denied, unsupported, etc.)
      }
    }

    setup();
  }, []);

  return null;
}

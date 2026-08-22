import { supabase } from "./supabase";
import { useData } from "./data-store";
import type { RealtimeChannel } from "@supabase/supabase-js";

let activeChannel: RealtimeChannel | null = null;

/**
 * Initializes real-time subscriptions using Supabase WebSockets.
 * Replaces expensive 12s polling loops with instant push notifications.
 */
export function setupRealtimeSubscriptions(userId: string, role: string) {
  if (!supabase || typeof window === "undefined" || !userId) return;

  // Clean up any existing channel before creating a new one
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }

  const channel = supabase.channel(`user-realtime:${userId}`);

  // 1. Listen for new notifications for this user
  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${userId}`,
    },
    (payload: any) => {
      const newOrUpdated = payload.new;
      if (newOrUpdated) {
        useData.setState((s) => {
          const exists = s.notifications.some((n) => n.id === newOrUpdated.id);
          const list = exists
            ? s.notifications.map((n) => (n.id === newOrUpdated.id ? { ...n, ...newOrUpdated } : n))
            : [newOrUpdated, ...s.notifications];
          return { notifications: list };
        });
      }
    },
  );

  // 2. Listen for incoming user messages
  channel.on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `to_id=eq.${userId}`,
    },
    (payload: any) => {
      const msg = payload.new;
      if (msg) {
        useData.setState((s) => ({
          messages: [msg, ...s.messages.filter((m) => m.id !== msg.id)],
        }));
      }
    },
  );

  // 3. For Admins and Teachers: listen for certificate requests & updates
  if (role === "admin" || role === "teacher") {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "certificates",
      },
      (payload: any) => {
        const cert = payload.new;
        if (cert) {
          useData.setState((s) => {
            const exists = s.certificates.some((c) => c.id === cert.id);
            const list = exists
              ? s.certificates.map((c) => (c.id === cert.id ? { ...c, ...cert } : c))
              : [cert, ...s.certificates];
            return { certificates: list };
          });
        }
      },
    );
  }

  channel.subscribe((status: string) => {
    if (status === "SUBSCRIBED") {
      console.log(`[Realtime] Connected to real-time event channel for user ${userId}`);
    }
  });

  activeChannel = channel;
}

export function teardownRealtimeSubscriptions() {
  if (activeChannel && supabase) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }
}

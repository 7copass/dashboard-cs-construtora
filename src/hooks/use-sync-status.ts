"use client";

import { useState, useEffect, useCallback } from "react";

interface SyncStatus {
  status: "synced" | "syncing" | "error";
  lastSync: string | null;
}

export function useSyncStatus() {
  const [data, setData] = useState<SyncStatus>({
    status: "synced",
    lastSync: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/sync/status");
      if (res.ok) {
        const json = await res.json();
        setData({
          status: json.status || "synced",
          lastSync: json.lastSync || null,
        });
      }
    } catch {
      // Silently handle errors — keep previous state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return {
    status: data.status,
    lastSync: data.lastSync,
    isLoading,
  };
}

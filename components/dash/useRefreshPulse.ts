"use client";

import { useEffect, useState } from "react";

/**
 * Refresh visible dashboard data periodically and when returning to a stale tab.
 * Hidden tabs do not poll. Each refresh is throttled to at most once per interval.
 */
export function useRefreshPulse(intervalMs: number): number {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    let lastRefresh = Date.now();
    const check = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefresh < intervalMs) return;
      lastRefresh = now;
      setPulse((n) => n + 1);
    };

    const timer = window.setInterval(check, Math.min(intervalMs, 60_000));
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [intervalMs]);

  return pulse;
}

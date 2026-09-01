"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => {
          reg.unregister();
        });
      });
    }
  }, []);

  return null;
}
